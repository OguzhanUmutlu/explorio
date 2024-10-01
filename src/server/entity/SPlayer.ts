import {PlayerEntity} from "../../common/entity/types/PlayerEntity";
import {SEntity} from "./SEntity";
import {PlayerNetwork} from "../PlayerNetwork";
import {SWorld} from "../world/SWorld";
import {CHUNK_LENGTH_BITS} from "../../common/utils/Utils";
import {SBlockBreakingUpdatePacket} from "../../common/packet/server/SBlockBreakingUpdatePacket";
import {SBlockBreakingStopPacket} from "../../common/packet/server/SBlockBreakingStopPacket";
import {B} from "../../common/meta/ItemIds";

export class SPlayer extends PlayerEntity implements SEntity {
    rotation = 0;
    network = new PlayerNetwork(this);
    viewingChunks: number[] = [];
    sentChunks: Set<number> = new Set;
    world: SWorld;
    breaking = null;
    breakingTime = 0;

    constructor(public ws, public name: string, public skin: string, world: SWorld) {
        super(world);
    };

    calcCacheState() {
        return `${this.rotation.toFixed(1)};${super.calcCacheState()}`;
    };

    serverUpdate(dt: number) {
        super.serverUpdate(dt);
        const chunkX = Math.round(this.x) >> CHUNK_LENGTH_BITS;
        const chunks = [];
        for (let x = chunkX - 2; x <= chunkX + 2; x++) {
            chunks.push(x);
            this.world.ensureChunk(x);
            if (!this.sentChunks.has(x)) {
                this.sentChunks.add(x);
                (<any>this.world).sendChunk(<any>this, x);
            }
            ++this.world.chunkReferees[x];
        }
        for (const x of this.sentChunks) {
            if (!chunks.includes(x)) {
                this.world.chunkReferees[x]--;
                this.sentChunks.delete(x);
            }
        }
        this.viewingChunks = chunks;

        this.breakingTime = Math.max(0, this.breakingTime - dt);

        if (this.breaking && this.breakingTime === 0) {
            const bx = this.breaking[0];
            const by = this.breaking[1];
            this.breaking = null;
            if (!this.world.tryToBreakBlockAt(this, bx, by)) {
                this.network.sendBlock(bx, by);
                return;
            }

            for (const p of this.world.getChunkViewers(bx >> CHUNK_LENGTH_BITS)) {
                p.network.sendBlock(bx, by, B.AIR);
            }
        }
    };

    despawn() {
        super.despawn();
        for (const x of this.viewingChunks) {
            this.world.chunkReferees[x]--;
        }
    };

    teleport(x: number, y: number) {
        super.teleport(x, y);
        this.network.sendPosition();
    };

    broadcastBlockBreaking() {
        if (this.breaking) this.world.broadcastPacketAt(this.breaking[0], this.breaking[1], new SBlockBreakingUpdatePacket({
            entityId: this.id,
            x: this.breaking[0],
            y: this.breaking[1],
            time: this.breakingTime
        }), [this]);
        else this.world.broadcastPacketAt(this.x, this.y, new SBlockBreakingStopPacket({
            entityId: this.id
        }), [this]);
    };

    sendMessage(message: string): void {
        this.network.sendMessage(message);
    };
}