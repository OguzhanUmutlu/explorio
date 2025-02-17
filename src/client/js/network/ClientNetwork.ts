import Packet from "@/network/Packet";
import {ClientEntityClasses, getWSUrls, Options, setServerOptions} from "@c/utils/Utils";
import {EntityUpdateStruct, PacketByName, Packets, readPacket} from "@/network/Packets";
import PacketError from "@/network/PacketError";
import CPlayer from "@c/entity/types/CPlayer";
import CWorld from "@c/world/CWorld";
import {PacketIds} from "@/meta/PacketIds";
import {clientPlayer, isMultiPlayer, particleManager, ServerInfo, setConnectionText} from "@dom/Client";
import SocketWorker from "@c/worker/SocketWorker?worker";
import {Version} from "@/Versions";
import {BM} from "@/meta/ItemIds";
import LittleBlockParticle from "@c/particle/types/LittleBlockParticle";
import {DefaultGravity} from "@/entity/Entity";
import {Containers, InventoryName} from "@/meta/Inventories";
import Item from "@/item/Item";
import Player from "@/entity/defaults/Player";
import {EntityIds} from "@/meta/Entities";

export default class ClientNetwork {
    worker: { postMessage(e: Buffer): void, terminate(): void };
    connected = false;
    connectCb: () => void;
    connectPromise = new Promise(r => this.connectCb = () => r(null));
    batch: Packet[] = [];
    immediate: Packet[] = [];
    handshake = false;
    ping = 0;
    kickReason = "";

    whenConnect() {
        return this.connectPromise;
    };

    processPacketBuffer(buf: Buffer) {
        try {
            const packet = readPacket(Buffer.from(buf));
            this.processPacket(packet);
        } catch (err) {
            if (err instanceof PacketError) throw err;
            printer.error(err);
            throw new PacketError(err.message, buf);
        }
    };

    async _connect() {
        const urls = getWSUrls(ServerInfo.ip, ServerInfo.port);
        if (!ServerInfo.preferSecure) urls.reverse();
        this.kickReason = "";
        const worker = this.worker = new SocketWorker();
        worker.onmessage = async (e: MessageEvent) => {
            if (e.data.event === "message") {
                const buf = await e.data.message.arrayBuffer();
                this.processPacketBuffer(buf);
            } else if (e.data.event === "connect") {
                setConnectionText("Joining the world...");
                this.connected = true;
                this.connectCb();
                if (e.data.url === urls[1]) setServerOptions(ServerInfo.uuid, {preferSecure: !ServerInfo.preferSecure});
                printer.info("Connected to server");
                for (const pk of this.immediate) {
                    this.sendPacket(pk, true);
                }
                this.immediate.length = 0;
                this.releaseBatch();
                this.sendAuth(true);
            } else if (e.data.event === "disconnect") {
                setConnectionText(this.kickReason || "Disconnected from the server");
                this.connected = false;
                printer.info("Disconnected from the server");
            } else if (e.data.event === "fail") {
                setConnectionText("Failed to connect to server");
                printer.fail("Failed to connect to server");
            }
        };
        worker.postMessage(urls);
    };

    processPacket(pk: Packet) {
        const key = `process${Object.keys(PacketIds).find(i => PacketIds[i] === pk.packetId)}`;
        if (key in this) this[key](pk);
        else printer.warn("Unhandled packet: ", pk);
    };

    processBatch({data}: PacketByName<"Batch">) {
        for (const p of data) {
            this.processPacket(p);
        }
    };

    processPing({data}: PacketByName<"Ping">) {
        this.ping = Date.now() - data.getTime();
        this.sendPacket(new Packets.Ping(new Date));
    };

    processSHandshake({data}: PacketByName<"SHandshake">) {
        setConnectionText("");
        this.handshake = true;
        clientPlayer.immobile = false;
        clientPlayer.id = data.entityId;
        clientPlayer.x = data.x;
        clientPlayer.y = data.y;
        clientPlayer.handIndex = data.handIndex;
        clientPlayer.init();
    };

    spawnEntityFromData(data: typeof EntityUpdateStruct["__TYPE__"]) {
        const entity = new ClientEntityClasses[data.typeId](clientPlayer.world);
        entity.id = data.entityId;

        for (const k in data.props) {
            entity[k] = data.props[k];
        }

        entity.renderX = entity.x;
        entity.renderY = entity.y;
        entity.lastX = entity.x;
        entity._x = entity.x;
        entity._y = entity.y;
        entity.world = clientPlayer.world;
        if (entity.typeId === EntityIds.PLAYER) entity.gravity = 0;
        entity.init();
        return entity;
    };

    processSChunk({data: {x, data}}: PacketByName<"SChunk">) {
        const world = <CWorld>clientPlayer.world;
        const chunk = world.getChunk(x, false);
        chunk.blocks = data;
        world.chunksGenerated.add(x);
        chunk.recalculateLights();

        world.prepareChunkRenders(x - 1, false, true);
        world.prepareChunkRenders(x);
        world.prepareChunkRenders(x + 1, false, true);
    };

    processSSetChunkEntities({data: {x, entities}}: PacketByName<"SSetChunkEntities">) {
        const world = <CWorld>clientPlayer.world;
        const chunk = world.getChunk(x, false);

        chunk.entities.clear();

        for (const entity of entities) {
            this.spawnEntityFromData(entity);
        }

        if (clientPlayer.chunkX === x) {
            clientPlayer._chunkX = NaN;
            clientPlayer.onMovement();
        }
    };

    processSEntityUpdate({data}: PacketByName<"SEntityUpdate">) {
        const entity = clientPlayer.world.entities[data.entityId];
        if (!entity) return this.spawnEntityFromData(data);
        const dist = entity.distance(data.props.x, data.props.y);
        Object.assign(entity, data.props);
        if ("handItemId" in data.props && "handItemMeta" in data.props && entity instanceof Player) {
            entity.handItem = new Item(data.props.handItemId, data.props.handItemMeta);
        }

        if (entity === clientPlayer) {
            clientPlayer.updateCacheState();
            clientPlayer.teleport(entity.x, entity.y);
        }

        if (dist > 0) entity.onMovement();
    };

    processSEntityRemove({data}: PacketByName<"SEntityRemove">) {
        const entity = clientPlayer.world.entities[data];
        if (!entity) return printer.error("Entity ID not found:", data);
        entity.despawn();
    };

    processSBlockUpdate({data: {x, y, fullId}}: PacketByName<"SBlockUpdate">) {
        clientPlayer.world.setFullBlock(x, y, fullId);
        for (const player of clientPlayer.world.getPlayers()) {
            if (player.breaking && player.breaking[0] === x && player.breaking[1] === y) {
                player.breaking = null;
                player.breakingTime = 0;
            }
        }
    };

    processSBlockBreakingUpdate({data}: PacketByName<"SBlockBreakingUpdate">) {
        const entity = clientPlayer.world.entities[data.entityId];
        if (!(entity instanceof CPlayer)) return;
        entity.breaking = [data.x, data.y];
        entity.breakingTime = entity.world.getBlock(data.x, data.y).getBreakTime(entity.handItem);
    };

    processSBlockBreakingStop({data}: PacketByName<"SBlockBreakingStop">) {
        const entity = clientPlayer.world.entities[data.entityId];
        if (!(entity instanceof CPlayer)) return;
        entity.breaking = null;
        entity.breakingTime = 0;
    };

    processSDisconnect({data: reason}: PacketByName<"SDisconnect">) {
        this.kickReason = reason;
        printer.warn("Got kicked:", reason);
    };

    processSPlaySound({data: {x, y, path, volume}}: PacketByName<"SPlaySound">) {
        clientPlayer.playSoundAt(path, x, y, volume);
    };

    processSPlaceBlock({data: {x, y, fullId}}: PacketByName<"SPlaceBlock">) {
        const block = BM[fullId];
        clientPlayer.playSoundAt(block.randomPlace(), x, y);
    };

    processSBreakBlock({data: {x, y, fullId}}: PacketByName<"SBreakBlock">) {
        const block = BM[fullId];
        clientPlayer.playSoundAt(block.randomBreak(), x, y);
        const particleAmount = [0, 5, 25, 100][Options.particles];
        for (let i = 0; i < particleAmount; i++) {
            particleManager.add(new LittleBlockParticle(x + Math.random() / 10 - 0.05, y + Math.random() / 10 - 0.05, block));
        }
    };

    processSSetAttributes({data}: PacketByName<"SSetAttributes">) {
        for (const k in data) {
            if (k === "seeShadows" && data[k] !== clientPlayer[k]) (<CWorld>clientPlayer.world).subChunkRenders = {};
            if (k in clientPlayer) clientPlayer[k] = data[k];
        }
        clientPlayer.gravity = clientPlayer.isFlying ? 0 : DefaultGravity;
        if (clientPlayer.isFlying) {
            clientPlayer.vx = 0;
            clientPlayer.vy = 0;
        }
    };

    processSSetInventory({data}: PacketByName<"SSetInventory">) {
        clientPlayer.inventories[data.name].setContents(data.items);
    };

    processSUpdateInventory({data}: PacketByName<"SUpdateInventory">) {
        const inv = clientPlayer.inventories[data.name];
        for (const d of data.indices) {
            inv.set(d.index, d.item);
        }
    };

    processSResetPlaceCooldown(_: PacketByName<"SResetPlaceCooldown">) {
        clientPlayer.placeTime = 0;
    };

    processSSetContainer({data: {container, x, y}}: PacketByName<"SSetContainer">) {
        clientPlayer.containerId = container;
        clientPlayer.containerX = x;
        clientPlayer.containerY = y;
    };

    processSSetHandIndex({data}: PacketByName<"SSetHandIndex">) {
        clientPlayer.handIndex = data;
    };


    processSendMessage({data}: PacketByName<"SendMessage">) {
        clientPlayer.sendMessage(data);
    };

    sendStopBreaking(immediate = false) {
        this.sendPacket(new Packets.CStopBreaking(null), immediate);
    };

    sendToggleFlight(immediate = false) {
        this.sendPacket(new Packets.CToggleFlight(null), immediate);
    };

    sendStartBreaking(x: number, y: number, immediate = false) {
        this.sendPacket(new Packets.CStartBreaking({x, y}), immediate);
    };

    sendAuth(immediate = true) {
        const skin = clientPlayer.skin.image;
        const canvas = document.createElement("canvas");
        canvas.width = skin.width;
        canvas.height = skin.height;
        canvas.getContext("2d").drawImage(skin, 0, 0);

        this.sendPacket(new Packets.CAuth({
            name: clientPlayer.name, skin: canvas.toDataURL(), version: Version
        }), immediate);
    };

    sendMovement(x: number, y: number, rotation: number, immediate = true) {
        this.sendPacket(new Packets.CMovement({x, y, rotation}), immediate);
    };

    sendMessage(message: string) {
        this.sendPacket(new Packets.SendMessage(message.split("\n")[0]));
    };

    sendHandIndex(index = clientPlayer.handIndex) {
        clientPlayer.handIndex = index;
        this.sendPacket(new Packets.CSetHandIndex(index));
    };

    makeItemTransfer(fromInventory: InventoryName, fromIndex: number, to: {
        inventory: InventoryName,
        index: number,
        count: number
    }[]) {
        const from = clientPlayer.inventories[fromInventory];
        for (const t of to) {
            from.transfer(fromIndex, clientPlayer.inventories[t.inventory], t.index, t.count);
        }
        this.sendItemTransfer(fromInventory, fromIndex, to);
    };

    sendItemTransfer(fromInventory: InventoryName, fromIndex: number, to: {
        inventory: InventoryName,
        index: number,
        count: number
    }[]) {
        this.sendPacket(new Packets.CItemTransfer({fromInventory, fromIndex, to}));
    };

    makeItemSwap(fromInventory: InventoryName, fromIndex: number, toInventory: InventoryName, toIndex: number) {
        const from = clientPlayer.inventories[fromInventory];
        const to = clientPlayer.inventories[toInventory];
        const fromItem = from.get(fromIndex);
        from.set(fromIndex, to.get(toIndex));
        to.set(toIndex, fromItem);
        this.sendItemSwap(fromInventory, fromIndex, toInventory, toIndex);
    };

    sendItemSwap(fromInventory: InventoryName, fromIndex: number, toInventory: InventoryName, toIndex: number) {
        this.sendPacket(new Packets.CItemSwap({fromInventory, fromIndex, toInventory, toIndex}));
    };

    sendPlaceBlock(x: number, y: number, rotation: number, immediate = false) {
        this.sendPacket(new Packets.CPlaceBlock({x, y, rotation}), immediate);
    };

    sendInteractBlock(x: number, y: number, immediate = false) {
        this.sendPacket(new Packets.CInteractBlock({x, y}), immediate);
    };

    sendOpenInventory() {
        clientPlayer.containerId = Containers.PlayerInventory;
        this.sendPacket(new Packets.COpenInventory(null));
    };

    sendCloseInventory() {
        clientPlayer.containerId = Containers.Closed;
        this.sendPacket(new Packets.CCloseInventory(null));
    };

    sendDropItem(inventory: InventoryName, index: number, count: number) {
        this.sendPacket(new Packets.CItemDrop({
            index, count, inventory
        }));
    };

    sendSetItem(inventory: InventoryName, index: number, item: Item) {
        this.sendPacket(new Packets.CSetItem({
            inventory, index, item
        }));
    };

    sendPacket(pk: Packet, immediate = false) {
        if (immediate || !isMultiPlayer) {
            if (this.connected) pk.send(this.worker);
            else this.immediate.push(pk);
        } else {
            this.batch.push(pk);
        }
    };

    releaseBatch() {
        if (!this.connected || this.batch.length === 0) return;

        if (this.batch.length === 1) {
            this.sendPacket(this.batch[0], true);
        } else {
            this.sendPacket(new Packets.Batch(this.batch), true);
        }

        this.batch.length = 0;
    };
}