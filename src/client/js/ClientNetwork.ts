import {BatchPacket} from "../../common/packet/common/BatchPacket";
import {Packet,} from "../../common/packet/Packet";
import {SHandshakePacket} from "../../common/packet/server/SHandshakePacket";
import {getWSUrls, setServerOptions} from "./Utils";
import {clientNetwork, clientPlayer, ServerData} from "./Client";
import {DEFAULT_GRAVITY} from "../../common/entity/Entity";
import {CurrentGameProtocol, readPacket} from "../../common/packet/Packets";
import {SChunkPacket} from "../../common/packet/server/SChunkPacket";
import {SEntityUpdatePacket} from "../../common/packet/server/SEntityUpdatePacket";
import {SEntityRemovePacket} from "../../common/packet/server/SEntityRemovePacket";
import {EntityClasses} from "../../common/meta/Entities";
import {PacketError} from "../../common/packet/PacketError";
import {PacketIds} from "../../common/packet/PacketIds";
import {CHUNK_LENGTH_BITS} from "../../common/utils/Utils";
import {SBlockUpdatePacket} from "../../common/packet/server/SBlockUpdatePacket";
import {SBlockBreakingUpdatePacket} from "../../common/packet/server/SBlockBreakingUpdatePacket";
import {SBlockBreakingStopPacket} from "../../common/packet/server/SBlockBreakingStopPacket";
import {CPlayer} from "./entity/types/CPlayer";
import {SendMessagePacket} from "../../common/packet/common/SendMessagePacket";
import {CStopBreakingPacket} from "../../common/packet/client/CStopBreakingPacket";
import {CStartBreakingPacket} from "../../common/packet/client/CStartBreakingPacket";
import {CAuthPacket} from "../../common/packet/client/CAuthPacket";
import {CMovementPacket} from "../../common/packet/client/CMovementPacket";

// This class is for client contacting the server, not for singleplayer
export class ClientNetwork {
    worker: Worker;
    connected = false;
    connectCb: Function;
    connectPromise = new Promise(r => this.connectCb = r);
    batch: Packet<any>[] = [];
    immediate: Packet<any>[] = [];
    handshake = false;

    constructor() {
        this._connect().then(r => r);
    };

    whenConnect() {
        return this.connectPromise;
    };

    private async _connect() {
        const urls = getWSUrls(ServerData.ip, ServerData.port);
        if (!ServerData.preferSecure) urls.reverse();
        const worker = this.worker = new Worker(new URL("./worker/SocketWorker.ts", import.meta.url), {type: "module"});
        worker.onmessage = e => {
            if (e.data.event === "message") {
                e.data.message.arrayBuffer().then(buf => {
                    try {
                        const packet = readPacket(Buffer.from(buf));
                        this.processPacket(packet);
                    } catch (err) {
                        if (err instanceof PacketError) throw err;
                        console.error(err);
                        throw new PacketError(err.message, e.data.message);
                    }
                });
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
            } else if (e.data.event === "disconnect") {
                this.connected = false;
            } else if (e.data.event === "fail") {
                printer.fail("Failed to connect to server");
            }
        };
        worker.postMessage([urls, PacketIds.PING]);
    };

    processPacket(pk: Packet<any>) {
        if (pk instanceof BatchPacket) {
            this.processBatch(pk);
        } else if (pk instanceof SHandshakePacket) {
            this.processHandshake(pk);
        } else if (pk instanceof SChunkPacket) {
            this.processChunk(pk);
        } else if (pk instanceof SEntityUpdatePacket) {
            this.processEntityUpdate(pk);
        } else if (pk instanceof SEntityRemovePacket) {
            this.processEntityRemove(pk);
        } else if (pk instanceof SBlockUpdatePacket) {
            this.processBlockUpdate(pk);
        } else if (pk instanceof SBlockBreakingUpdatePacket) {
            this.processBlockBreakingUpdate(pk);
        } else if (pk instanceof SBlockBreakingStopPacket) {
            this.processBlockBreakingStop(pk);
        } else if (pk instanceof SendMessagePacket) {
            this.processSendMessage(pk);
        } else {
            console.warn("Unhandled packet: ", pk);
        }
    };

    processBatch({data}: BatchPacket) {
        for (const p of data) {
            this.processPacket(p);
        }
    };

    processHandshake({data}: SHandshakePacket) {
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
        Object.assign(entity, data.props);
        entity.renderX = entity.x;
        entity.renderY = entity.y;
        entity.lastX = entity.x;
        entity._x = entity.x;
        entity._y = entity.y;
        entity.init();
        return entity;
    };

    processChunk({data}: SChunkPacket) {
        clientPlayer.world.chunks[data.x] = new Uint16Array(data.data);
        if (data.resetEntities) clientPlayer.world.chunkEntities[data.x] = [];
        clientPlayer.world.renderedSubChunks[data.x] = [];
        for (const entity of data.entities) {
            this.spawnEntityFromData(entity);
        }
        if (clientPlayer.x >> CHUNK_LENGTH_BITS === data.x) {
            clientPlayer.onMovement();
        }
    };

    processEntityUpdate({data}: SEntityUpdatePacket) {
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

    processEntityRemove({data}: SEntityRemovePacket) {
        const entity = clientPlayer.world.entities[data];
        if (!entity) return printer.error("Entity not found: ", data);
        entity.despawn();
    };

    processBlockUpdate({data}: SBlockUpdatePacket) {
        clientPlayer.world.setFullBlock(data.x, data.y, data.fullId);
        for (const player: CPlayer of clientPlayer.world.getPlayers()) {
            if (player.breaking && player.breaking[0] === data.x && player.breaking[1] === data.y) {
                player.breaking = null;
                player.breakingTime = 0;
            }
        }
    };

    processBlockBreakingUpdate({data}: SBlockBreakingUpdatePacket) {
        const entity = clientPlayer.world.entities[data.entityId];
        if (!(entity instanceof CPlayer)) return;
        entity.breaking = [data.x, data.y];
        entity.breakingTime = entity.world.getBlockMetaAt(data.x, data.y).getHardness();
    };

    processBlockBreakingStop({data}: SBlockBreakingStopPacket) {
        const entity = clientPlayer.world.entities[data.entityId];
        if (!(entity instanceof CPlayer)) return;
        entity.breaking = null;
        entity.breakingTime = 0;
    };

    processSendMessage({data}: SendMessagePacket) {
        clientPlayer.sendMessage(data);
    };

    sendPacket(pk: Packet<any>, immediate = false) {
        if (immediate) {
            if (this.connected) this.worker.postMessage(pk.serialize());
            else this.immediate.push(pk);
        } else {
            this.batch.push(pk);
        }
    };

    sendStopBreaking(immediate = false) {
        clientNetwork.sendPacket(new CStopBreakingPacket(null), immediate);
    };

    sendStartBreaking(x: number, y: number, immediate = false) {
        clientNetwork.sendPacket(new CStartBreakingPacket({x, y}), immediate);
    };

    sendAuth(name: string, skin: string, immediate = true) {
        clientNetwork.sendPacket(new CAuthPacket({
            name, skin, protocol: CurrentGameProtocol
        }), immediate);
    };

    sendMovement(x: number, y: number, rotation: number, immediate = true) {
        clientNetwork.sendPacket(new CMovementPacket({x, y, rotation}), immediate);
    };

    sendMessage(message: string) {
        clientNetwork.sendPacket(new SendMessagePacket(message));
    };

    releaseBatch() {
        if (!this.connected || this.batch.length === 0) return;

        if (this.batch.length === 1) {
            this.worker.postMessage(this.batch[0].serialize());
        } else {
            this.sendPacket(new BatchPacket(this.batch), true);
        }

        this.batch.length = 0;
    };
}