import {Packet,} from "../../../common/network/Packet.js";
import {getWSUrls, setServerOptions, URLPrefix} from "../utils/Utils.js";
import {clientPlayer, isMultiPlayer, ServerData} from "../Client.js";
import {DEFAULT_GRAVITY} from "../../../common/entity/Entity.js";
import {CurrentGameProtocol, PacketByName, Packets, readPacket} from "../../../common/network/Packets.js";
import {EntityClasses} from "../../../common/meta/Entities.js";
import {PacketError} from "../../../common/network/PacketError.js";
import {CHUNK_LENGTH_BITS} from "../../../common/utils/Utils.js";
import {CPlayer} from "../entity/types/CPlayer.js";
import {Sound} from "../../../common/utils/Sound.js";
import {CWorld} from "../world/CWorld.js";
import {PacketIds} from "../../../common/meta/PacketIds.js";

export class ClientNetwork {
    worker: Worker;
    connected = false;
    connectCb: Function;
    connectPromise = new Promise(r => this.connectCb = r);
    batch: Packet[] = [];
    immediate: Packet[] = [];
    handshake = false;
    ping = 0;

    whenConnect() {
        return this.connectPromise;
    };

    processPacketBuffer(buf: Buffer) {
        try {
            const packet = readPacket(Buffer.from(buf));
            this.processPacket(packet);
        } catch (err) {
            if (err instanceof PacketError) throw err;
            console.error(err);
            throw new PacketError(err.message, buf);
        }
    };

    async _connect() {
        const urls = getWSUrls(ServerData.ip, ServerData.port);
        if (!ServerData.preferSecure) urls.reverse();
        const worker = this.worker = new Worker(new URL("./worker/SocketWorker.ts", import.meta.url), {type: "module"});
        worker.onmessage = async e => {
            if (e.data.event === "message") {
                const buf = await e.data.message.arrayBuffer();
                this.processPacketBuffer(buf);
            } else if (e.data.event === "connect") {
                this.connected = true;
                this.connectCb();
                if (e.data.url === urls[1]) setServerOptions(ServerData.uuid, {preferSecure: !ServerData.preferSecure});
                printer.info("Connected to server");
                for (const pk of this.immediate) {
                    this.sendPacket(pk, true);
                }
                this.immediate.length = 0;
                this.releaseBatch();
                this.sendAuth(true);
            } else if (e.data.event === "disconnect") {
                this.connected = false;
                printer.info("Disconnected from the server");
            } else if (e.data.event === "fail") {
                printer.fail("Failed to connect to server");
            }
        };
        worker.postMessage(urls);
    };

    processPacket(pk: Packet) {
        const key = `process${Object.keys(PacketIds).find(i => PacketIds[i] === pk.packetId)}`;
        if (key in this) this[key](pk);
        else console.warn("Unhandled packet: ", pk);
    };

    processBatch({data}: PacketByName["Batch"]) {
        for (const p of data) {
            this.processPacket(p);
        }
    };

    processPing({data}: PacketByName["Ping"]) {
        this.ping = Date.now() - data;
        this.sendPacket(new Packets.Ping(new Date));
    };

    processCQuit() {
        location.href = URLPrefix;
    };

    processSHandshake({data}: PacketByName["SHandshake"]) {
        this.handshake = true;
        clientPlayer.gravity = DEFAULT_GRAVITY;
        clientPlayer.immobile = false;
        clientPlayer.id = data.entityId;
        clientPlayer.x = data.x;
        clientPlayer.y = data.y;
        clientPlayer.init();
    };

    spawnEntityFromData(data) {
        const entity = new EntityClasses[data.typeId](clientPlayer.world);
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
        entity.init();
        return entity;
    };

    processSChunk({data}: PacketByName["SChunk"]) {
        const world = <CWorld>clientPlayer.world;
        world.chunks[data.x] = new Uint16Array(data.data);
        if (data.resetEntities) clientPlayer.world.chunkEntities[data.x] = [];
        world.renderedSubChunks[data.x] = [];
        world.renderedSubChunks[data.x - 1] = [];
        world.renderedSubChunks[data.x + 1] = [];
        for (const entity of data.entities) {
            this.spawnEntityFromData(entity);
        }

        if (clientPlayer.x >> CHUNK_LENGTH_BITS === data.x) {
            clientPlayer.onMovement();
        }
    };

    processSEntityUpdate({data}: PacketByName["SEntityUpdate"]) {
        let entity = clientPlayer.world.entities[data.entityId];
        if (!entity) return this.spawnEntityFromData(data);
        delete data.entityId;
        delete data.typeId;
        const dist = entity.distance(data.props.x, data.props.y);
        Object.assign(entity, data.props);
        if (entity === clientPlayer) {
            clientPlayer.updateCacheState();
        }
        if (dist > 0) entity.onMovement();
    };

    processSEntityRemove({data}: PacketByName["SEntityRemove"]) {
        const entity = clientPlayer.world.entities[data];
        if (!entity) return printer.error("Entity not found: ", data);
        entity.despawn();
    };

    processSBlockUpdate({data}: PacketByName["SBlockUpdate"]) {
        clientPlayer.world.setFullBlock(data.x, data.y, data.fullId);
        for (const player: CPlayer of clientPlayer.world.getPlayers()) {
            if (player.breaking && player.breaking[0] === data.x && player.breaking[1] === data.y) {
                player.breaking = null;
                player.breakingTime = 0;
            }
        }
    };

    processSBlockBreakingUpdate({data}: PacketByName["SBlockBreakingUpdate"]) {
        const entity = clientPlayer.world.entities[data.entityId];
        if (!(entity instanceof CPlayer)) return;
        entity.breaking = [data.x, data.y];
        entity.breakingTime = entity.world.getBlock(data.x, data.y).getHardness();
    };

    processSBlockBreakingStop({data}: PacketByName["SBlockBreakingStop"]) {
        const entity = clientPlayer.world.entities[data.entityId];
        if (!(entity instanceof CPlayer)) return;
        entity.breaking = null;
        entity.breakingTime = 0;
    };

    processSDisconnect({data: reason}: PacketByName["SDisconnect"]) {
        printer.warn("Got kicked: ", reason);
    };

    processSSound({data: {x, y, path}}: PacketByName["SPlaySound"]) {
        const distance = clientPlayer.distance(x, y);
        if (distance > 20) return;
        const volume = 1 / distance;
        Sound.play(path, volume);
    };

    processSendMessage({data}: PacketByName["SendMessage"]) {
        clientPlayer.sendMessage(data);
    };


    sendStopBreaking(immediate = false) {
        this.sendPacket(new Packets.CStopBreaking(null), immediate);
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
            name: clientPlayer.name, skin: canvas.toDataURL(), protocol: CurrentGameProtocol
        }), immediate);
    };

    sendMovement(x: number, y: number, rotation: number, immediate = true) {
        this.sendPacket(new Packets.CMovement({x, y, rotation}), immediate);
    };

    sendMessage(message: string) {
        this.sendPacket(new Packets.SendMessage(message.split("\n")[0]));
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