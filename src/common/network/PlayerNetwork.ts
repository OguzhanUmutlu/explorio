import {Packet} from "@/network/Packet";
import {EntityIds} from "@/meta/Entities";
import {Player} from "@/entity/defaults/Player";
import {PacketByName, Packets, readPacket} from "@/network/Packets";
import {PacketIds} from "@/meta/PacketIds";
import {UsernameRegex, zstdOptionalEncode} from "@/utils/Utils";
import {Version} from "@/Versions";
import {Containers, CraftingResultMap, InventoryName} from "@/meta/Inventories";

import {ItemTransferEvent} from "@/event/defaults/ItemTransferEvent";
import {ItemSwapEvent} from "@/event/defaults/ItemSwapEvent";
import {findCrafting, inventoryToGrid} from "@/crafting/CraftingUtils";
import {Crafting} from "@/crafting/Crafting";
import {Inventory} from "@/item/Inventory";
import {PlayerOpenContainerEvent} from "@/event/defaults/PlayerOpenContainerEvent";
import {PlayerCloseContainerEvent} from "@/event/defaults/PlayerCloseContainerEvent";
import {PlayerLoginEvent} from "@/event/defaults/PlayerLoginEvent";
import {PlayerJoinEvent} from "@/event/defaults/PlayerJoinEvent";
import {PlayerToggleFlightEvent} from "@/event/defaults/PlayerToggleFlightEvent";
import {PlayerSetHandIndexEvent} from "@/event/defaults/PlayerSetHandIndexEvent";
import {PlayerMoveEvent} from "@/event/defaults/PlayerMoveEvent";
import {PlayerStartBreakingEvent} from "@/event/defaults/PlayerStartBreakingEvent";
import {PlayerStopBreakingEvent} from "@/event/defaults/PlayerStopBreakingEvent";
import {PlayerDropItemEvent} from "@/event/defaults/PlayerDropItemEvent";
import {PlayerCreativeItemAccessEvent} from "@/event/defaults/PlayerCreativeItemAccessEvent";
import {Entity} from "@/entity/Entity";
import {ItemIds} from "@/meta/ItemIds";
import {Item} from "@/item/Item";
import {Server} from "@/Server";
import {Chunk} from "@/world/Chunk";

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

export class PlayerNetwork {
    batch: Packet[] = [];
    uuid = crypto.randomUUID();
    player: Player;
    ip: string;
    kickReason: string;
    closed = false;
    compressPackets = false;

    constructor(public server: Server, public ws: WSLike, public req: ReqLike) {
        this.ip = req.socket.remoteAddress;
    };

    processPacket(pk: Packet) {
        if (!this.server.ready || this.server.closed) return;
        const key = `process${Object.keys(PacketIds).find(i => PacketIds[i] === pk.packetId)}`;
        if (key in this) this[key](pk);
        else printer.warn("Unhandled packet: ", pk);
    };

    processBatch({data}: PacketByName<"Batch">) {
        for (const p of data) {
            this.processPacket(p);
        }
    };

    processCMovement({data: {x, y, rotation}}: PacketByName<"CMovement">) {
        if (
            this.player.despawned
            || Math.abs(this.player.x - x) > (this.player.isFlying ? this.player.flySpeed : this.player.walkSpeed) / 5 * 1.5
            || Math.abs(this.player.y - y) > 5
        ) return this.sendPosition(); // UNEXPECTED
        if (new PlayerMoveEvent(this.player, x, y, rotation).callGetCancel()) return this.sendPosition();

        this.player.x = x;
        this.player.y = y;
        this.player.rotation = rotation;
        // @ts-expect-error Low level access needed.
        this.player.onMovement();
    };

    processCStartBreaking({data}: PacketByName<"CStartBreaking">) {
        if (this.player.despawned || !this.player.world.canBreakBlockAt(this.player, data.x, data.y)) {
            return this.sendBlock(data.x, data.y); // UNEXPECTED
        }

        if (new PlayerStartBreakingEvent(this.player).callGetCancel()) this.sendBlock(data.x, data.y);

        this.player.breaking = [data.x, data.y];
        this.player.breakingTime = this.player.world.getBlock(data.x, data.y).getBreakTime(this.player.handItem);
        this.player.broadcastBlockBreaking();
    };

    processCStopBreaking() {
        if (
            this.player.despawned
            || !this.player.breaking
            || new PlayerStopBreakingEvent(this.player).callGetCancel()
        ) return;
        this.player.breaking = null;
        this.player.breakingTime = 0;
        this.player.broadcastBlockBreaking();
    };

    async processCAuth({data: {name, skin, version, secret}}: PacketByName<"CAuth">) {
        if (Object.keys(this.server.players).length >= this.server.config.maxPlayers) {
            return this.kick("Server is full");
        }

        if (version !== Version) {
            return this.kick(version > Version ? "Client is outdated" : "Server is outdated");
        }

        if (!UsernameRegex.test(name)) {
            return this.kick(`Invalid username, usernames have to fit the regex: ${UsernameRegex.toString()}`);
        }

        if (this.player || name in this.server.players) {
            return this.kick("You are already in game");
        }

        let serv = this.server.config.auth;

        if (secret && !serv) {
            return this.kick("Invalid authorization");
        }

        if (serv && !serv.startsWith("http://") && !serv.startsWith("https://")) serv = "http://" + serv;

        if (secret) {
            const response = await fetch(serv + "/use-key", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({key: secret.toString()})
            }).catch(e => e);

            if (response instanceof Error) {
                return this.kick("Couldn't connect to authorization server");
            }

            if (response.statusText !== "OK") {
                return this.kick("Invalid authorization (" + response.statusText + ")");
            }
        }

        if (Object.keys(this.server.players).length >= this.server.config.maxPlayers) {
            return this.kick("Server is full");
        }

        const loginEvent = new PlayerLoginEvent(name, this.ip);
        loginEvent.call();

        if (loginEvent.cancelled) {
            return this.kick(loginEvent.kickMessage ?? "You are not allowed to join the server");
        }

        const player = this.player = await Player.loadPlayer(this.server, name);
        player.network = this;
        player.skin = skin;

        if (!player.init()) return this.kick("Failed to load player data");

        this.server.players[player.name] = player;

        printer.info(`${this.player.name}(${this.ip}) connected`);
        this.server.broadcastMessage(`§e${this.player.name} joined the server`);

        this.sendPacket(new Packets.SHandshake({
            entityId: this.player.id,
            x: player.x,
            y: player.y,
            handIndex: player.handIndex,
            compressPackets: this.server.config.packetCompression
        }), true);
        this.compressPackets = this.server.config.packetCompression;
        this.sendInventories(true);
        this.sendAttributes(true);

        new PlayerJoinEvent(player).call();
    };

    processCPlaceBlock({data: {x, y, rotation}}: PacketByName<"CPlaceBlock">) {
        const world = this.player.world;
        const handItem = this.player.handItem;

        if (this.player.despawned || !handItem || !world.tryToPlaceBlockAt(this.player, x, y, handItem.id, handItem.meta, rotation)) {
            this.sendResetPlaceCooldown();
            this.sendHandItem();
            return this.sendBlock(x, y);
        }

        if (!this.player.infiniteResource) {
            this.player.hotbarInventory.decreaseItemAt(this.player.handIndex);
        }
    };

    processCInteractBlock({data: {x, y}}: PacketByName<"CInteractBlock">) {
        this.player.world.tryToInteractBlockAt(this.player, x, y);
    };

    processCToggleFlight() {
        if (this.player.despawned || this.player.canToggleFly) {
            const ev = new PlayerToggleFlightEvent(this.player, !this.player.isFlying);
            ev.call();
            if (ev.cancelled) return;
            this.player.setFlying(ev.enabled);
        }
    };

    processCSetHandIndex({data}: PacketByName<"CSetHandIndex">) {
        if (this.player.despawned || data > 8 || data < 0 || this.player.handIndex === data) return;

        const ev = new PlayerSetHandIndexEvent(this.player, data);
        ev.call();

        if (ev.cancelled) return;

        this.player.handIndex = ev.handIndex;

        if (ev.handIndex !== data) {
            this.sendHandIndex();
        }

        this.player.broadcastHandItem();
    };

    processCOpenInventory() {
        if (this.player.despawned || this.player.containerId !== Containers.Closed) return;
        const cancel = new PlayerOpenContainerEvent(this.player, Containers.PlayerInventory).callGetCancel();
        if (cancel) return this.sendContainer();
        this.player.containerId = Containers.PlayerInventory;
    };

    processCCloseInventory() {
        if (this.player.despawned) return;
        const cancel = new PlayerCloseContainerEvent(this.player, this.player.containerId).callGetCancel();
        if (cancel) return this.sendContainer();
        this.player.containerId = Containers.Closed;
        this.player.onCloseContainer();
    };

    processCItemTransfer({data: {fromInventory, fromIndex, to}}: PacketByName<"CItemTransfer">) {
        if (this.player.despawned) return;
        const inventories = this.player.inventories;
        const from = inventories[fromInventory];
        const isFromResult = fromInventory in CraftingResultMap;
        let crafting: Crafting;
        let craftingSource: Inventory;

        let cancelled = false;

        if (isFromResult) {
            craftingSource = inventories[CraftingResultMap[fromInventory]];
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

        cancelled ||=
            // Need something to transfer
            !fromItem
            // If you're getting items from a crafting result, you have to take all of them
            || (isFromResult && fromItem?.count !== totalCount)
            // Just a sanity check
            || totalCount === 0
            // You can't transfer between inventories that you don't have access to
            || !accessibleInventories.includes(fromInventory);

        if (!cancelled) for (const t of to) {
            if (
                // Target inventory cannot be a crafting result
                (t.inventory in CraftingResultMap)
                // You can't transfer between the same place, just doesn't make sense
                || (fromInventory === t.inventory && fromIndex === t.index)
                // You can't transfer between inventories that you don't have access to
                || !accessibleInventories.includes(t.inventory)
                // You have to put an armor to the armor slot
                || (t.inventory === "armor" && fromItem && fromItem.toMetadata().armorType !== t.index)
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
            if (isFromResult) {
                crafting.removeFrom(craftingSource);
            }

            // no need to update it again, client already knows.
            if (!alreadyFrom) from.dirtyIndexes.delete(fromIndex);
        }
    };

    processCItemSwap({data: {fromInventory, fromIndex, toInventory, toIndex}}: PacketByName<"CItemSwap">) {
        if (this.player.despawned) return;
        const from = this.player.inventories[fromInventory];
        const to = this.player.inventories[toInventory];

        const accessibleInventories = this.player.getAccessibleInventoryNames();
        const fromItem = from.get(fromIndex);
        const toItem = to.get(toIndex);

        const cancelled =
            // Target or source inventory cannot be a crafting result
            (fromInventory in CraftingResultMap)
            || (toInventory in CraftingResultMap)

            // You can't swap between the same place, just doesn't make sense
            || (from === to && fromIndex === toIndex)

            // You can't swap between inventories that you don't have access to
            || !accessibleInventories.includes(fromInventory)
            || !accessibleInventories.includes(toInventory)

            // You have to put an armor to the armor slot
            || (toInventory === "armor" && fromItem && fromItem.toMetadata().armorType !== toIndex)
            || (fromInventory === "armor" && toItem && toItem.toMetadata().armorType !== toIndex)

            // Check if plugins want to cancel
            || new ItemSwapEvent(this.player, from, fromIndex, to, toIndex).callGetCancel();

        if (cancelled) {
            from.updateIndex(fromIndex);
            to.updateIndex(toIndex);
        } else {
            const alreadyFrom = from.dirtyIndexes.has(fromIndex);
            const alreadyTo = to.dirtyIndexes.has(toIndex);

            from.set(fromIndex, toItem);
            to.set(toIndex, fromItem);

            // no need to update it again, client already knows.
            if (!alreadyFrom) from.dirtyIndexes.delete(fromIndex);
            if (!alreadyTo) to.dirtyIndexes.delete(toIndex);
        }
    };

    processCItemDrop({data: {inventory, index, count}}: PacketByName<"CItemDrop">) {
        if (this.player.despawned || !this.player.canAccessInventory(inventory)) return;

        const inv = this.player.inventories[inventory];
        const item = inv.get(index);

        if (!item || item.count < count) return;

        if (new PlayerDropItemEvent(this.player, inv, index, count, item).callGetCancel()) {
            // let the client know
            return inv.dirtyIndexes.add(index);
        }

        const alreadyDirty = inv.dirtyIndexes.has(index);
        this.player.dropItem(inv, index, count);
        this.player.world.playSound("assets/sounds/random/pop.ogg", this.player.x, this.player.y);
        if (!alreadyDirty && inv.dirtyIndexes.has(index)) inv.dirtyIndexes.delete(index);
    };

    processCSetItem({data: {inventory, index, item}}: PacketByName<"CSetItem">) {
        if (this.player.despawned || !this.player.infiniteResource || !this.player.canAccessInventory(inventory)) return;

        const inv = this.player.inventories[inventory];

        if (!item || item.count === 0) return;

        if (item.id === ItemIds.NATURAL_LOG) item = new Item(ItemIds.LOG, item.meta, item.count, item.components);

        if (new PlayerCreativeItemAccessEvent(this.player, inv, index, item).callGetCancel()) {
            // let the client know
            return inv.dirtyIndexes.add(index);
        }

        const alreadyDirty = inv.dirtyIndexes.has(index);
        inv.set(index, item);
        if (!alreadyDirty && inv.dirtyIndexes.has(index)) inv.dirtyIndexes.delete(index);
    };

    processCRespawn() {
        if (!this.player.despawned) return;

        this.player.respawn();
    };

    async processSendMessage({data}: PacketByName<"SendMessage">) {
        if (this.player.despawned || !data) return;

        await this.player.server.processMessage(this.player, data);
    };

    sendPacket(pk: Packet, immediate = false) {
        if (immediate) {
            this.ws.send(
                this.compressPackets ? zstdOptionalEncode(pk.serialize()) : pk.serialize()
            );
        } else {
            this.batch.push(pk);
        }
    };

    async processPrePacket(pk: Packet) {
        if (!this.player) {
            if (!(pk instanceof Packets.CAuth)) {
                return this.kick("Invalid authentication");
            }

            await this.processCAuth(<PacketByName<"CAuth">>pk);
        } else {
            try {
                this.processPacket(pk);
            } catch (e) {
                printer.error(pk, e);
                this.kick("Internal server error");
                return;
            }
        }
    };

    async processPacketBuffer(data: Buffer) {
        if (this.server.closed) return;
        let pk: Packet;
        try {
            pk = readPacket(data, this.compressPackets);
        } catch (e) {
            printer.error(data);
            printer.error(e);
            return this.kick("Invalid packet");
        }

        await this.processPrePacket(pk);
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

    sendHandItem(immediate = false) {
        this.sendInventoryIndices("hotbar", [this.player.handIndex], immediate);
    };

    sendResetPlaceCooldown(immediate = false) {
        this.sendPacket(new Packets.SResetPlaceCooldown(null), immediate);
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

    sendHandIndex(immediate = false) {
        this.sendPacket(new Packets.SSetHandIndex(this.player.handIndex), immediate);
    };

    sendBlock(x: number, y: number, fullId = null, immediate = false) {
        this.sendPacket(new Packets.SBlockUpdate({
            x, y,
            fullId: fullId ?? this.player.world.getFullBlockAt(x, y)
        }), immediate);
    };

    sendPosition(immediate = false) {
        this.sendPacket(new Packets.SEntitiesUpdate([{
            typeId: EntityIds.PLAYER,
            entityId: this.player.id,
            props: {x: this.player.x, y: this.player.y}
        }]), immediate);
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

    sendChunks(chunks: Chunk[], immediate = false) {
        if (this.player.world.unloaded) return;
        const packets = [];
        for (const chunk of chunks) {
            if (chunk.isFilled) {
                packets.push({x: chunk.x, biome: chunk.biome, data: chunk.blocks});
            }
        }
        this.sendPacket(new Packets.SSetChunks(packets), immediate);
    };

    sendEntities(entities: Entity[], immediate = false) {
        if (entities.length < 0) return;
        const data = entities.filter(e => !e.despawned).map(e => e.spawnPkData);
        if (data.length === 0) return;
        this.sendPacket(new Packets.SEntitiesUpdate(data), immediate);
    };

    kick(reason = "Kicked by an operator") {
        this.kickReason = reason;
        if (this.player) {
            delete this.server.players[this.player.name];
        }
        this.sendPacket(new Packets.SDisconnect(reason), true);
        this.ws.close();
    };

    async onClose() {
        if (this.closed) return;
        this.closed = true;
        if (this.player) {
            this.player.onCloseContainer();
            await this.player.save();
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