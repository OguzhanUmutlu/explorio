import Packet from "@/network/Packet";
import {Entities} from "@/meta/Entities";
import Player from "@/entity/types/Player";
import {PacketByName, Packets, readPacket} from "@/network/Packets";
import {PacketIds} from "@/meta/PacketIds";
import {getServer} from "@/utils/Utils";
import {ItemIds} from "@/meta/ItemIds";
import {Version} from "@/Versions";
import Inventory from "@/item/Inventory";

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
            y: player.y
        }), true);
        this.sendAttributes(true);
    };

    processCPlaceBlock({data: {x, y}}: PacketByName<"CPlaceBlock">) {
        const world = this.player.world;
        if (!world.tryToPlaceBlockAt(this.player, x, y, ItemIds.GRASS_BLOCK, 0)) return this.sendBlock(x, y);
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
                return this.kick("Invalid auth");
            }

            this.processCAuth(<PacketByName<"CAuth">>pk);
        } else {
            try {
                await this.processPacket(pk);
            } catch (e) {
                printer.error(pk, e);
                this.kick("Invalid packet");
                return;
            }
        }
    };

    syncInventory(name: string, immediate = false) {
        const inv = <Inventory>this.player.containers[name];
        if (inv.cleanDirty) {
            this.sendPacket(new Packets.SContainerSet({
                name, items: inv.getContents()
            }), immediate);
            inv.cleanDirty = false;
            inv.dirtyIndexes.clear();
        } else if (inv.dirtyIndexes.size > 0) {
            const indices = Array.from(inv.dirtyIndexes);
            const contents = inv.getContents();
            this.sendPacket(new Packets.SContainerSetIndices(indices.map(i => {
                return {index: i, name, item: contents[i]};
            })), immediate);
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
        if (this.player) {
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