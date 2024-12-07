import Packet from "@/network/Packet";
import {Entities} from "@/meta/Entities";
import Player from "@/entity/types/Player";
import {PacketByName, Packets, readPacket} from "@/network/Packets";
import {PacketIds} from "@/meta/PacketIds";
import {getServer} from "@/utils/Utils";
import {Version} from "@/Versions";
import {Containers, InventoryName} from "@/meta/Inventories";
import Entity from "@/entity/Entity";
import {ItemTransferEvent} from "@/event/types/ItemTransferEvent";

type WSLike = {
    send(data: Buffer): void;
    close(): void;
    kick?: (reason: string) => void;
};

type ReqLike = {
    socket: {
        remoteAddress?: string;
    };
};

export default class PlayerNetwork {
    batch: Packet[] = [];
    uuid = crypto.randomUUID();
    player: Player;
    ip: string;
    kickReason: string;
    server = getServer();
    closed = false;

    constructor(public ws: WSLike, public req: ReqLike) {
        this.ip = req.socket.remoteAddress;
    };

    async processPacket(pk: Packet) {
        await this.server.pluginPromise;
        if (this.server.terminated) return;
        const key = `process${Object.keys(PacketIds).find(i => PacketIds[i] === pk.packetId)}`;
        if (key in this) this[key](pk);
        else printer.warn("Unhandled packet: ", pk);
    };

    async processBatch({data}: PacketByName<"Batch">) {
        for (const p of data) {
            await this.processPacket(p);
        }
    };

    processCMovement({data}: PacketByName<"CMovement">) {
        if (
            Math.abs(this.player.x - data.x) > 1.5
            || Math.abs(this.player.y - data.y) > 5
        ) {
            return this.sendPosition();
        }
        this.player.x = data.x;
        this.player.y = data.y;
        this.player.rotation = data.rotation;
        this.player.onMovement();
    };

    processCStartBreaking({data}: PacketByName<"CStartBreaking">) {
        if (!this.player.world.canBreakBlockAt(this.player, data.x, data.y)) return this.sendBlock(data.x, data.y);
        this.player.breaking = [data.x, data.y];
        this.player.breakingTime = this.player.world.getBlock(data.x, data.y).getHardness();
        this.player.broadcastBlockBreaking();
    };

    processCStopBreaking() {
        if (!this.player.breaking) return;
        this.player.breaking = null;
        this.player.breakingTime = 0;
        this.player.broadcastBlockBreaking();
    };

    processCAuth({data: {name, skin, version}}: PacketByName<"CAuth">) {
        if (version !== Version) {
            return this.kick(version > Version ? "Client is outdated" : "Server is outdated");
        }
        if (this.player || name in this.server.players) {
            return this.kick("You are already in game");
        }

        const player = this.player = Player.loadPlayer(name);
        player.network = this;
        player.skin = skin;
        player.init();
        this.server.players[player.name] = player;
        player.broadcastSpawn();
        printer.info(`${this.player.name}(${this.ip}) connected`);
        this.server.broadcastMessage(`§e${this.player.name} joined the server`);
        this.sendPacket(new Packets.SHandshake({
            entityId: this.player.id,
            x: player.x,
            y: player.y,
            handIndex: player.handIndex
        }), true);
        this.sendInventories(true);
        this.sendAttributes(true);
    };

    processCPlaceBlock({data: {x, y, rotation}}: PacketByName<"CPlaceBlock">) {
        const world = this.player.world;
        const handItem = this.player.handItem;

        if (!handItem || !world.tryToPlaceBlockAt(this.player, x, y, handItem.id, handItem.meta, rotation)) return this.sendBlock(x, y);

        if (!this.player.infiniteResource) {
            this.player.inventories.hotbar.decreaseItemAt(this.player.handIndex);
        }
    };

    processCToggleFlight(_: PacketByName<"CToggleFlight">) {
        if (this.player.canToggleFly) {
            this.player.setFlying(!this.player.isFlying);
        }
    };

    processCSetHandIndex({data}: PacketByName<"CSetHandIndex">) {
        if (data > 8 || data < 0) return;
        this.player.handIndex = data;
        this.player.world.broadcastPacketAt(this.player.x, new Packets.SEntityUpdate({
            entityId: this.player.id, typeId: Entities.PLAYER, props: {handIndex: data}
        }), [this.player]);
    };

    processCOpenInventory(_: PacketByName<"COpenInventory">) {
        if (this.player.containerId !== Containers.Closed) return;
        this.player.containerId = Containers.PlayerInventory;
    };

    processCCloseInventory(_: PacketByName<"CCloseInventory">) {
        this.player.containerId = Containers.Closed;
        this.player.emptyCursor();
    };

    processCItemTransfer({data: {fromInventory, fromIndex, toInventory, toIndex, count}}
                             : PacketByName<"CItemTransfer">) {
        const from = this.player.inventories[fromInventory];
        const to = this.player.inventories[toInventory];

        const alreadyFrom = from.dirtyIndexes.has(fromIndex);
        const alreadyTo = to.dirtyIndexes.has(toIndex);
        const accessibleInventories = this.player.getAccessibleInventoryNames();

        const cancelled = !accessibleInventories.includes(fromInventory)
            || !accessibleInventories.includes(toInventory)
            || new ItemTransferEvent(this.player, from, fromIndex, to, toIndex, count).callGetCancel()
            || !from.transfer(fromIndex, to, toIndex, count);

        if (cancelled) {
            from.updateIndex(fromIndex);
            to.updateIndex(toIndex);
        } else {
            // no need to update it again, client already knows.
            if (!alreadyFrom && from.dirtyIndexes.has(fromIndex)) from.dirtyIndexes.delete(fromIndex);
            if (!alreadyTo && to.dirtyIndexes.has(toIndex)) to.dirtyIndexes.delete(toIndex);
        }
    };


    processSendMessage({data}: PacketByName<"SendMessage">) {
        if (!data) return;
        this.player.server.processMessage(this.player, data);
    };

    sendBlock(x: number, y: number, fullId = null, immediate = false) {
        this.sendPacket(new Packets.SBlockUpdate({
            x, y,
            fullId: fullId ?? this.player.world.getFullBlockAt(x, y)
        }), immediate);
    };

    sendPosition(immediate = false) {
        this.sendPacket(new Packets.SEntityUpdate({
            typeId: Entities.PLAYER,
            entityId: this.player.id,
            props: {x: this.player.x, y: this.player.y}
        }), immediate);
    };

    sendMessage(message: string, immediate = false) {
        this.sendPacket(new Packets.SendMessage(message), immediate);
    };

    sendAttributes(immediate = false) {
        this.sendPacket(new Packets.SSetAttributes(this.player), immediate);
    };

    sendSound(path: string, x: number, y: number, volume = 1, immediate = false) {
        this.sendPacket(new Packets.SPlaySound({path, x, y, volume}), immediate);
    };

    sendChunk(chunkX: number, data: Uint16Array, entities?: Entity[], resetEntities = true, immediate = false) {
        this.sendPacket(new Packets.SChunk({
            x: chunkX, data, entities: entities.filter(i => i !== this.player).map(i => ({
                entityId: i.id, typeId: i.typeId, props: i.getSpawnData()
            })), resetEntities
        }), immediate);
    };

    sendPacket(pk: Packet, immediate = false) {
        if (immediate) {
            pk.send(this.ws);
        } else {
            this.batch.push(pk);
        }
    };

    async processPacketBuffer(data: Buffer) {
        let pk: Packet;
        try {
            pk = readPacket(data);
        } catch (e) {
            printer.error(data);
            printer.error(e);
            return this.kick("Invalid packet");
        }

        if (!this.player) {
            if (!(pk instanceof Packets.CAuth)) {
                return this.kick("Invalid authentication");
            }

            this.processCAuth(<PacketByName<"CAuth">>pk);
        } else {
            try {
                await this.processPacket(pk);
            } catch (e) {
                printer.error(pk, e);
                this.kick("Internal server error");
                return;
            }
        }
    };

    sendInventories(immediate = false) {
        for (const name in this.player.inventories) {
            const n = <InventoryName>name;
            this.sendInventory(n, immediate);
        }
    };

    sendInventory(name: InventoryName, immediate = false) {
        const inv = this.player.inventories[name];

        this.sendPacket(new Packets.SSetInventory({
            name, items: inv.getContents()
        }), immediate);
    };

    sendInventoryIndices(name: InventoryName, indices: number[], immediate = false) {
        const inv = this.player.inventories[name];
        const contents = inv.getContents();
        this.sendPacket(new Packets.SUpdateInventory({
            name, indices: indices.map(i => ({index: i, item: contents[i]}))
        }), immediate);
    };

    syncInventory(name: InventoryName, immediate = false) {
        const inv = this.player.inventories[name];
        if (inv.wholeDirty) {
            this.sendInventory(name, immediate);
            inv.wholeDirty = false;
            inv.dirtyIndexes.clear();
        } else if (inv.dirtyIndexes.size > 0) {
            const indices = Array.from(inv.dirtyIndexes);
            this.sendInventoryIndices(name, indices, immediate);
            inv.dirtyIndexes.clear();
        }
    };

    kick(reason = "Kicked by an operator") {
        this.kickReason = reason;
        if (this.player) {
            delete this.server.players[this.player.name];
        }
        new Packets.SDisconnect(reason).send(this.ws);
        this.ws.close();
    };

    onClose() {
        if (this.closed) return;
        this.closed = true;
        if (this.player) {
            this.player.emptyCursor();
            this.player.save();
            delete this.server.players[this.player.name];
            this.player.despawn();
            printer.info(`${this.player.name}(${this.ip}) disconnected: ${this.kickReason || "client disconnect"}`);
            this.server.broadcastMessage(`§e${this.player.name} left the server`);
            this.player = null;
        }
    };

    releaseBatch() {
        if (this.batch.length === 0) return;

        if (this.batch.length === 1) {
            this.sendPacket(this.batch[0], true);
        } else {
            this.sendPacket(new Packets.Batch(this.batch), true);
        }

        this.batch.length = 0;
    };
}