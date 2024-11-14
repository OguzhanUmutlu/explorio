import {World} from "../../../common/world/World";
import {CHUNK_LENGTH_BITS, SUB_CHUNK_AMOUNT} from "../../../common/utils/Utils";
import {CSubChunk} from "./CSubChunk";

export class CWorld extends World {
    subChunkRenders: Record<number, CSubChunk[]> = {};

    ensureChunk(x: number, generate = true) {
        super.ensureChunk(x, generate);
        this.subChunkRenders[x] ??= [];
        for (let y = 0; y < SUB_CHUNK_AMOUNT; y++) this.subChunkRenders[x][y] ??= new CSubChunk(this, x, y);
    };

    async loadChunk(x: number) {
        return false;
    };

    renderSubChunk(x: number, y: number) {
        this.ensureChunk(x);
        this.subChunkRenders[x][y].render();
    };

    _setBlock(x: number, y: number, fullId: number, generate = true, polluteChunk = true, broadcast = true) {
        const b = super._setBlock(x, y, fullId, generate, polluteChunk, broadcast);
        if (b) {
            x = x >> CHUNK_LENGTH_BITS;
            y = y >> CHUNK_LENGTH_BITS;
            if (this.subChunkRenders[x]) this.prepareSubChunkSurroundingRenders(x, y);
        }
        return b;
    };

    prepareChunkRenders(x: number) {
        const chunkRender = this.subChunkRenders[x];
        if (chunkRender) for (let y = 0; y < SUB_CHUNK_AMOUNT; y++) {
            const subChunkRender = chunkRender[y];
            subChunkRender.rendered = false;
        }
    };

    prepareSubChunkRenders(x: number, y: number) {
        const chunk = this.subChunkRenders[x];
        if (chunk) {
            chunk[y].rendered = false;
        }
    };

    prepareSubChunkUpDownRenders(x: number, y: number) {
        const chunkRender = this.subChunkRenders[x];
        if (chunkRender) {
            chunkRender[y].rendered = false;
            if (y >= 1) chunkRender[y - 1].rendered = false;
            if (y < SUB_CHUNK_AMOUNT - 1) chunkRender[y + 1].rendered = false;
        }
    };

    prepareSubChunkSurroundingRenders(x: number, y: number) {
        this.prepareSubChunkUpDownRenders(x - 1, y);
        this.prepareSubChunkUpDownRenders(x, y);
        this.prepareSubChunkUpDownRenders(x + 1, y);
    };
}