import Packet from "@/network/Packet";
import {ClientEntityClasses, getWSUrls, Options, setServerOptions} from "@c/utils/Utils";
import {EntityUpdateStruct, PacketByName, Packets, readPacket} from "@/network/Packets";
import PacketError from "@/network/PacketError";
import CPlayer from "@c/entity/types/CPlayer";
import CWorld from "@c/world/CWorld";
import {PacketIds} from "@/meta/PacketIds";
import {
    clientPlayer,
    isMultiPlayer,
    particleManager,
    resetKeyboard,
    ServerInfo,
    serverNetwork,
    setConnectionText,
    showDeathScreen
} from "@dom/Client";
// @ts-expect-error ?worker
import SocketWorker from "@c/worker/SocketWorker?worker";
import {Version} from "@/Versions";
import LittleBlockParticle from "@c/particle/types/LittleBlockParticle";
import {Containers, InventoryName} from "@/meta/Inventories";
import Item from "@/item/Item";
import Player from "@/entity/defaults/Player";
import {EntityIds} from "@/meta/Entities";
import {DefaultGravity} from "@/entity/Entity";
import {getCookie} from "@dom/components/CookieHandler";
import {TokenCookieName} from "@dom/components/options/Menus";
import {copyBuffer} from "@/utils/Utils";
import {AnimationDurations} from "@/meta/Animations";
import {Buffer} from "buffer";
import {f2data} from "@/item/ItemFactory";

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
    serverIp = "";

    whenConnect() {
        return this.connectPromise;
    };

    processPacketBuffer(buf: Buffer) {
        try {
            const packet = readPacket(copyBuffer(buf));
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
                this.serverIp = e.data.ip;
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
            } else if (e.data.event === "disconnect") {
                setConnectionText(this.kickReason || "Disconnected from the server");
                this.connected = false;
                printer.info("Disconnected from the server");
            } else if (e.data.event === "fail") {
                setConnectionText("Failed to connect to server");
                printer.fail("Failed to connect to server");
            }
        };

        worker.postMessage({urls, auth: Options.auth});
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

    async processSPreLoginInformation({data: {auth}}: PacketByName<"SPreLoginInformation">) {
        if (auth && auth !== Options.auth) {
            return this.kickSelf("Server uses an incompatible auth URL: " + auth);
        }

        if (auth) {
            let serv = Options.auth;
            if (!serv.startsWith("http://") && !serv.startsWith("https://")) serv = "http://" + serv;
            const response = await fetch(serv + "/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ip: this.serverIp,
                    token: getCookie(TokenCookieName)
                })
            }).catch(e => e);

            if (response instanceof Error) {
                return this.kickSelf(response.message);
            }

            const authSecret = await response.text();

            return this.sendAuth(authSecret, true);
        }

        this.sendAuth(null, true);
    }

    processSHandshake({data: {entityId, x, y, handIndex}}: PacketByName<"SHandshake">) {
        setConnectionText("");
        this.handshake = true;
        clientPlayer.immobile = false;
        clientPlayer.id = entityId;
        clientPlayer.x = x;
        clientPlayer.y = y;
        clientPlayer.setHandIndex(handIndex);
        clientPlayer.init();

        if (!isMultiPlayer) {
            serverNetwork.player.permissions.add("*");
        }
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

    processSChunk({data: {x, biome, data}}: PacketByName<"SChunk">) {
        const world = <CWorld>clientPlayer.world;
        const chunk = world.getChunk(x, false);
        chunk.__setBiome(biome);
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
            // @ts-expect-error Low level access.
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

        // @ts-expect-error Low level access.
        if (dist > 0) entity.onMovement();
    };

    processSEntityAnimation({data}: PacketByName<"SEntityAnimation">) {
        const entity = clientPlayer.world.entities[data.entityId];
        if (!entity) return printer.error("<AnimationPacket> Entity ID not found:", data.entityId);
        entity.animation = {...data.animation, time: AnimationDurations[data.animation.id]};
    };

    processSEntityRemove({data}: PacketByName<"SEntityRemove">) {
        if (data === clientPlayer.id) {
            clientPlayer.despawned = true;
            showDeathScreen();
            resetKeyboard();
            return;
        }
        const entity = clientPlayer.world.entities[data];
        if (!entity) return printer.error("<RemovePacket> Entity ID not found:", data);
        entity.despawn(false);
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
        setConnectionText(reason);
        if (!isMultiPlayer) this.connected = false;
    };

    processSPlaySound({data: {x, y, path, volume}}: PacketByName<"SPlaySound">) {
        clientPlayer.playSoundAt(path, x, y, volume);
    };

    processSPlaceBlock({data: {x, y, fullId}}: PacketByName<"SPlaceBlock">) {
        const block = f2data(fullId);
        clientPlayer.playSoundAt(block.randomPlace(), x, y);
    };

    processSBreakBlock({data: {x, y, fullId}}: PacketByName<"SBreakBlock">) {
        const block = f2data(fullId);
        clientPlayer.playSoundAt(block.randomBreak(), x, y);
        const particleAmount = [0, 5, 25, 100][Options.particles];
        for (let i = 0; i < particleAmount; i++) {
            particleManager.add(new LittleBlockParticle(x + Math.random() / 10 - 0.05, y + Math.random() / 10 - 0.05, clientPlayer.world, block));
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
        if (clientPlayer.health > 0) {
            clientPlayer.despawned = false;
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
        clientPlayer.setContainerId(container);
        clientPlayer.containerX = x;
        clientPlayer.containerY = y;
    };

    processSSetHandIndex({data}: PacketByName<"SSetHandIndex">) {
        clientPlayer.setHandIndex(data);
    };


    kickSelf(reason: string) {
        this.kickReason = reason;
        printer.warn("Got kicked:", reason);
        this.worker.terminate();
        this.connected = false;
        setConnectionText(reason);
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

    sendAuth(secret: string | null, immediate = true) {
        const skin = clientPlayer.skin.image;
        const canvas = document.createElement("canvas");
        canvas.width = skin.width;
        canvas.height = skin.height;
        canvas.getContext("2d").drawImage(skin, 0, 0);

        this.sendPacket(new Packets.CAuth({
            name: clientPlayer.name, skin: canvas.toDataURL(), version: Version, secret: secret && Buffer.from(secret)
        }), immediate);
    };

    sendMovement(x: number, y: number, rotation: number, immediate = true) {
        this.sendPacket(new Packets.CMovement({x, y, rotation}), immediate);
    };

    sendMessage(message: string) {
        this.sendPacket(new Packets.SendMessage(message.split("\n")[0]));
    };

    sendHandIndex(index = clientPlayer.handIndex) {
        clientPlayer.setHandIndex(index);
        this.sendPacket(new Packets.CSetHandIndex(index));
    };

    makeItemTransfer(fromInventory: InventoryName, fromIndex: number, to: {
        inventory: InventoryName,
        index: number,
        count: number
    }[]) {
        const from = clientPlayer.inventories[fromInventory];
        const fromItem = from.get(fromIndex);

        for (const t of to) {
            if (t.inventory === "armor" && fromItem && fromItem.toMetadata().armorType !== t.index) return;
        }

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
        const toItem = to.get(toIndex);
        if (
            (toInventory === "armor" && fromItem && fromItem.toMetadata().armorType !== toIndex)
            || (fromInventory === "armor" && toItem && toItem.toMetadata().armorType !== toIndex)
        ) return;
        from.set(fromIndex, toItem);
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
        clientPlayer.setContainerId(Containers.PlayerInventory);
        this.sendPacket(new Packets.COpenInventory(null));
    };

    sendCloseInventory() {
        clientPlayer.setContainerId(Containers.Closed);
        this.sendPacket(new Packets.CCloseInventory(null));
    };

    sendDropItem(inventory: InventoryName, index: number, count: number) {
        this.sendPacket(new Packets.CItemDrop({
            index, count, inventory
        }));
    };

    sendSetItem(inventory: InventoryName, index: number, item: Item, immediate = false) {
        this.sendPacket(new Packets.CSetItem({
            inventory, index, item
        }), immediate);
    };

    sendRespawn(immediate = false) {
        this.sendPacket(new Packets.CRespawn(null), immediate);
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