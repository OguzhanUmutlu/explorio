import {Entity} from "./Entity";
import {BoundingBox} from "../BoundingBox";
import {Entities, EntityBoundingBoxes} from "../Entities";

export class PlayerEntity extends Entity {
    bb: BoundingBox = EntityBoundingBoxes[Entities.PLAYER];
    viewingChunks: number[] = [];

    serverUpdate(dt: number) {
        const chunkX = Math.round(this.x) >> 4;
        const chunks = [];
        for (let x = chunkX - 2; x <= chunkX + 2; x++) {
            chunks.push(x);
            this.world.ensureChunk(x);
            ++this.world.chunkReferees[x];
        }
        this._dereferenceViewingChunks();
        this.viewingChunks = chunks;
    };

    _dereferenceViewingChunks() {
        for (const x of this.viewingChunks) {
            if (--this.world.chunkReferees[x] === 0) {
                this.world.unloadChunk(x);
            }
        }
    };

    destroy() {
        this._dereferenceViewingChunks();
    };
}