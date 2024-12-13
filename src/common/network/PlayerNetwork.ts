import Packet from "@/network/Packet";
import {Entities} from "@/meta/Entities";
import Player from "@/entity/types/Player";
import {PacketByName, Packets, readPacket} from "@/network/Packets";
import {PacketIds} from "@/meta/PacketIds";
import {getServer} from "@/utils/Utils";
import {Version} from "@/Versions";
import {Containers, CraftingMapFromResult, CraftingResultInventoryNames, InventoryName} from "@/meta/Inventories";
import Entity from "@/entity/Entity";
import {ItemTransferEvent} from "@/event/types/ItemTransferEvent";
import {ItemSwapEvent} from "@/event/types/ItemSwapEvent";
import {findCrafting, inventoryToGrid} from "@/crafting/CraftingUtils";
import {Crafting} from "@/crafting/Crafting";
import Inventory from "@/item/Inventory";
import {PlayerOpenContainerEvent} from "@/event/types/PlayerOpenContainerEvent";
import {PlayerCloseContainerEvent} from "@/event/types/PlayerCloseContainerEvent";

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
            this.player.hotbarInventory.decreaseItemAt(this.player.handIndex);
        }
    };

    processCInteractBlock({data: {x, y}}: PacketByName<"CInteractBlock">) {
        this.player.world.tryAndInteractBlockAt(this.player, x, y);
    };

    processCToggleFlight() {
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

    processCOpenInventory() {
        if (this.player.containerId !== Containers.Closed) return;
        const cancel = new PlayerOpenContainerEvent(this.player, Containers.PlayerInventory).callGetCancel();
        if (cancel) return // todo: this.sendPacket(new Packets.SCloseInventory(), true); I have to sleep early.
        this.player.containerId = Containers.PlayerInventory;
    };

    processCCloseInventory() {
        const cancel = new PlayerCloseContainerEvent(this.player, this.player.containerId).callGetCancel();
        if (cancel) return // todo: this.sendPacket(new Packets.SOpenInventory(this.player.containerId), true); I have to sleep early.
        this.player.containerId = Containers.Closed;
        this.player.onCloseContainer();
    };

    processCItemTransfer({data: {fromInventory, fromIndex, to}}: PacketByName<"CItemTransfer">) {
        const inventories = this.player.inventories;
        const from = inventories[fromInventory];
        const isCraftResult = CraftingResultInventoryNames.includes(fromInventory);
        let crafting: Crafting;
        let craftingSource: Inventory;

        let cancelled = false;

        if (isCraftResult) {
            craftingSource = inventories[CraftingMapFromResult[fromInventory]];
            const grid = inventoryToGrid(craftingSource);
            crafting = findCrafting(grid);
            const result = crafting?.getResult(grid);
            if (!result) {
                cancelled = true;
            } else {
                from.set(0, result);
                from.dirtyIndexes.delete(0);
            }
        }
        const totalCount = to.reduce((a, b) => a + b.count, 0)

        const fromItem = from.get(fromIndex);
        const alreadyFrom = from.dirtyIndexes.has(fromIndex);
        const accessibleInventories = this.player.getAccessibleInventoryNames();

        cancelled =
            cancelled
            // Need something to transfer
            || !fromItem
            // If you're getting items from a crafting result, you have to take all of them
            || (isCraftResult && fromItem?.count !== totalCount)
            // Just a sanity check
            || totalCount === 0
            // You can't transfer between inventories that you don't have access to
            || !accessibleInventories.includes(fromInventory);

        if (!cancelled) for (const t of to) {
            if (
                // Target inventory cannot be a crafting result
                CraftingResultInventoryNames.includes(t.inventory)
                // You can't transfer between the same place, just doesn't make sense
                || (fromInventory === t.inventory && fromIndex === t.index)
                // You can't transfer between inventories that you don't have access to
                || !accessibleInventories.includes(t.inventory)
            ) {
                cancelled = true;
                break;
            }
        }

        // Check if plugins want to cancel
        if (!cancelled && new ItemTransferEvent(this.player, from, fromIndex, to.map(i => ({
            inventory: inventories[i.inventory],
            index: i.index,
            count: i.count
        }))).callGetCancel()) {
            cancelled = true;
        }

        const undoes: (() => void)[] = [];

        if (!cancelled) {
            for (const t of to) {
                const inv = inventories[t.inventory];

                const alr = inv.dirtyIndexes.has(t.index);
                const u = from.transfer(fromIndex, inv, t.index, t.count);

                // no need to update it again, client already knows.
                if (!alr) inv.dirtyIndexes.delete(t.index);

                if (!u) {
                    cancelled = true;
                    break;
                }
                undoes.push(u);
            }
        }

        if (cancelled) {
            from.updateIndex(fromIndex);
            for (const u of undoes) u();
        } else {
            if (isCraftResult) {
                crafting.removeFrom(craftingSource);
            }

            // no need to update it again, client already knows.
            if (!alreadyFrom) from.dirtyIndexes.delete(fromIndex);
        }
    };

    processCItemSwap({data: {fromInventory, fromIndex, toInventory, toIndex}}: PacketByName<"CItemSwap">) {
        const from = this.player.inventories[fromInventory];
        const to = this.player.inventories[toInventory];

        const alreadyFrom = from.dirtyIndexes.has(fromIndex);
        const alreadyTo = to.dirtyIndexes.has(toIndex);
        const accessibleInventories = this.player.getAccessibleInventoryNames();

        const cancelled =
            // Target or source inventory cannot be a crafting result
            CraftingResultInventoryNames.includes(fromInventory)
            || CraftingResultInventoryNames.includes(toInventory)

            // You can't swap between the same place, just doesn't make sense
            || (from === to && fromIndex === toIndex)

            // You can't swap between inventories that you don't have access to
            || !accessibleInventories.includes(fromInventory)
            || !accessibleInventories.includes(toInventory)

            // Check if plugins want to cancel
            || new ItemSwapEvent(this.player, from, fromIndex, to, toIndex).callGetCancel();

        if (cancelled) {
            from.updateIndex(fromIndex);
            to.updateIndex(toIndex);
        } else {
            const fromItem = from.get(fromIndex);
            const toItem = to.get(toIndex);
            from.set(fromIndex, toItem);
            to.set(toIndex, fromItem);

            // no need to update it again, client already knows.
            if (!alreadyFrom) from.dirtyIndexes.delete(fromIndex);
            if (!alreadyTo) to.dirtyIndexes.delete(toIndex);
        }
    };

    processCItemDrop({data: {inventory, index, count}}: PacketByName<"CItemDrop">) {
        const inv = this.player.inventories[inventory];
        const item = inv.get(index);
        if (!item || item.count < count) return;
        const alreadyDirty = inv.dirtyIndexes.has(index);
        this.player.dropItem(inv, index, count);
        if (!alreadyDirty && inv.dirtyIndexes.has(index)) inv.dirtyIndexes.delete(index);
    };

    processCSetItem({data: {inventory, index, item}}: PacketByName<"CSetItem">) {
        if (!this.player.canAccessInventory(inventory)) return;

        const inv = this.player.inventories[inventory];

        const alreadyDirty = inv.dirtyIndexes.has(index);
        inv.set(index, item);
        if (!alreadyDirty && inv.dirtyIndexes.has(index)) inv.dirtyIndexes.delete(index);
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
        if (this.server.terminated) return;
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

    sendContainer(immediate = false) {
        this.sendPacket(new Packets.SSetContainer({
            container: this.player.containerId,
            x: this.player.containerX,
            y: this.player.containerY
        }), immediate);
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
            this.player.onCloseContainer();
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