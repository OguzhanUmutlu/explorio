import {SPlayer} from "./entity/SPlayer";
import {Packet} from "../common/packet/Packet";
import {BatchPacket} from "../common/packet/common/BatchPacket";
import {PacketError} from "../common/packet/PacketError";
import {CMovementPacket} from "../common/packet/client/CMovementPacket";
import {SEntityUpdatePacket} from "../common/packet/server/SEntityUpdatePacket";
import {Entities} from "../common/meta/Entities";
import {SBlockUpdatePacket} from "../common/packet/server/SBlockUpdatePacket";
import {CStartBreakingPacket} from "../common/packet/client/CStartBreakingPacket";
import {CStopBreakingPacket} from "../common/packet/client/CStopBreakingPacket";
import {SendMessagePacket} from "../common/packet/common/SendMessagePacket";

export class PlayerNetwork {
    batch: Packet<any>[] = [];

    constructor(public player: SPlayer) {
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
        const dist = this.player.distance(data.x, data.y);
        if (dist > 1.5) {
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
        this.player.breakingTime = this.player.world.getBlockMetaAt(data.x, data.y).getHardness();
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
            fullId: fullId || this.player.world.getBlockAt(x, y)
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
            pk.send(this.player.ws);
        } else {
            this.batch.push(pk);
        }
    };

    kick(reason = "Kicked by an operator") {
        this.player.ws.kick(reason);
    };

    releaseBatch() {
        if (this.batch.length === 0) return;

        if (this.batch.length === 1) {
            this.batch[0].send(this.player.ws);
        } else {
            new BatchPacket(this.batch).send(this.player.ws);
        }

        this.batch.length = 0;
    };
}