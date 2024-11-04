import {Packet} from "./Packet";
import {BatchPacket} from "./common/BatchPacket";
import {PacketError} from "./PacketError";
import {CMovementPacket} from "./client/CMovementPacket";
import {SEntityUpdatePacket} from "./server/SEntityUpdatePacket";
import {Entities} from "../meta/Entities";
import {SBlockUpdatePacket} from "./server/SBlockUpdatePacket";
import {CStartBreakingPacket} from "./client/CStartBreakingPacket";
import {CStopBreakingPacket} from "./client/CStopBreakingPacket";
import {SendMessagePacket} from "./common/SendMessagePacket";
import {Player} from "../entity/types/Player";
import {SDisconnectPacket} from "./server/SDisconnectPacket.js";
import {server} from "../Server.js";
import {readPacket} from "./Packets.js";
import {CAuthPacket} from "./client/CAuthPacket.js";
import {SHandshakePacket} from "./server/SHandshakePacket.js";

export class PlayerNetwork {
    batch: Packet<any>[] = [];
    uuid = crypto.randomUUID();
    player: Player;
    ip: string;
    kickReason: string;

    constructor(public ws, public req) {
        this.ip = req.socket.remoteAddress;
    };

    processPacket(pk: Packet<any>) {
        if (pk instanceof BatchPacket) {
            this.processBatch(pk);
        } else if (pk instanceof CMovementPacket) {
            this.processMovement(pk);
        } else if (pk instanceof CStartBreakingPacket) {
            this.processStartBreaking(pk);
        } else if (pk instanceof CStopBreakingPacket) {
            this.processStopBreaking(pk);
        } else if (pk instanceof SendMessagePacket) {
            this.processSendMessage(pk);
        } else {
            throw new PacketError("Invalid packet", pk);
        }
    };

    processBatch({data}: BatchPacket) {
        for (const p of data) {
            this.processPacket(p);
        }
    };

    processMovement({data}: CMovementPacket) {
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

    processStartBreaking({data}: CStartBreakingPacket) {
        if (!this.player.world.canBreakBlockAt(this.player, data.x, data.y)) return this.sendBlock(data.x, data.y);
        this.player.breaking = [data.x, data.y];
        this.player.breakingTime = this.player.world.getBlock(data.x, data.y).getHardness();
        this.player.broadcastBlockBreaking();
    };

    processStopBreaking(_: CStopBreakingPacket) {
        if (!this.player.breaking) return;
        this.player.breaking = null;
        this.player.breakingTime = 0;
        this.player.broadcastBlockBreaking();
    };

    processSendMessage({data}: SendMessagePacket) {
        if (!data) return;
        this.player.server.processMessage(this.player, data);
    };

    sendBlock(x: number, y: number, fullId = null, immediate = false) {
        this.sendPacket(new SBlockUpdatePacket({
            x, y,
            fullId: fullId ?? this.player.world.getFullBlockAt(x, y)
        }), immediate);
    };

    sendPosition(immediate = false) {
        this.sendPacket(new SEntityUpdatePacket({
            typeId: Entities.PLAYER,
            entityId: this.player.id,
            props: {x: this.player.x, y: this.player.y}
        }), immediate);
    };

    sendMessage(message: string, immediate = false) {
        this.sendPacket(new SendMessagePacket(message), immediate);
    };

    sendPacket(pk: Packet<any>, immediate = false) {
        if (immediate) {
            pk.send(this.ws);
        } else {
            this.batch.push(pk);
        }
    };

    async processPacketBuffer(data: Buffer) {
        let pk: Packet<any>;
        try {
            pk = readPacket(data);
        } catch (e) {
            printer.error(data);
            printer.error(e);
            return this.kick("Invalid packet");
        }

        if (!this.player) {
            if (!(pk instanceof CAuthPacket)) {
                return this.kick("Invalid auth");
            }

            if (pk.data.name in server.players) {
                return this.kick("You are already in game");
            }

            const player = this.player = await Player.loadPlayer(pk.data.name);
            player.network = this;
            player.skin = pk.data.skin;
            player.init();
            server.players[player.name] = player;
            player.network.sendPacket(new SHandshakePacket({
                entityId: this.player.id,
                x: player.x,
                y: player.y
            }), true);
            player.broadcastSpawn();
            printer.info(`${this.player.name}(${this.ip}) connected`)
            server.broadcastMessage(`§e${this.player.name} joined the server`);
        } else {
            try {
                this.processPacket(pk);
            } catch (e) {
                printer.error(pk);
                printer.error(e);
                this.kick("Invalid packet");
                return;
            }
        }
    };

    kick(reason = "Kicked by an operator") {
        this.kickReason = reason;
        if (this.player) {
            delete server.players[this.player.name];
        }
        new SDisconnectPacket(reason).send(this.ws);
        this.ws.close();
    };

    async onClose() {
        if (this.player) {
            await this.player.save();
            delete server.players[this.player.name];
            this.player.despawn();
            printer.info(`${this.player.name}(${this.ip}) disconnected: ${this.kickReason || "client disconnect"}`);
            server.broadcastMessage(`§e${this.player.name} left the server`);
            this.player = null;
        }
    };

    releaseBatch() {
        if (this.batch.length === 0) return;

        if (this.batch.length === 1) {
            this.sendPacket(this.batch[0], true);
        } else {
            this.sendPacket(new BatchPacket(this.batch), true);
        }

        this.batch.length = 0;
    };
}