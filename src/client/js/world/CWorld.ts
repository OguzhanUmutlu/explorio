import {Ring3, World} from "@explorio/world/World";
import {ChunkLengthBits, ChunkLengthN, SubChunkAmount} from "@explorio/utils/Utils";
import {CSubChunk} from "./CSubChunk";

export class CWorld extends World {
    subChunkRenders: Record<number, CSubChunk[]> = {};

    ensureChunk(chunkX: number, generate = true) {
        super.ensureChunk(chunkX, generate);
        this.subChunkRenders[chunkX] ??= [];
        for (let y = 0; y < SubChunkAmount; y++) this.subChunkRenders[chunkX][y] ??= new CSubChunk(this, chunkX, y);
    };

    loadChunk() {
        return false;
    };

    renderSubChunk(chunkX: number, chunkY: number) {
        this.ensureChunk(chunkX);
        this.subChunkRenders[chunkX][chunkY].render();
    };

    _polluteBlockAt(x: number, y: number) {
        super._polluteBlockAt(x, y);

        const chunkX = x >> ChunkLengthBits;
        const chunkY = y >> ChunkLengthBits;
        this.prepareSubChunkSurroundingRenders(chunkX, chunkY, false, true);
        this.renderBlockAt(x, y);
        const block = this.getBlock(x, y);
        if (!block.isOpaque) {
            for (const [dx, dy] of Ring3) {
                this.renderBlockAt(x + dx, y + dy);
            }
        }
    };

    getSubChunk(chunkX: number, chunkY: number) {
        return this.subChunkRenders[chunkX]?.[chunkY];
    };

    getSubChunkAt(x: number, y: number) {
        return this.getSubChunk(x >> ChunkLengthBits, y >> ChunkLengthBits);
    };

    prepareChunkRenders(chunkX: number, blocks = true, shadows = true) {
        const chunkRender = this.subChunkRenders[chunkX];
        if (chunkRender) for (let cy = 0; cy < SubChunkAmount; cy++) {
            const subChunkRender = chunkRender[cy];
            subChunkRender.prepare(blocks, shadows);
        }
    };

    prepareSubChunkRenders(chunkX: number, chunkY: number, blocks = true, shadows = true) {
        this.subChunkRenders[chunkX]?.[chunkY]?.prepare(blocks, shadows);
    };

    prepareSubChunkUpDownRenders(chunkX: number, chunkY: number, blocks = true, shadows = true) {
        const chunkRender = this.subChunkRenders[chunkX];
        chunkRender?.[chunkY]?.prepare(blocks, shadows);
        chunkRender?.[chunkY - 1]?.prepare(blocks, shadows);
        chunkRender?.[chunkY + 1]?.prepare(blocks, shadows);
    };

    prepareSubChunkSurroundingRenders(chunkX: number, chunkY: number, blocks = true, shadows = true) {
        this.prepareSubChunkUpDownRenders(chunkX - 1, chunkY, blocks, shadows);
        this.prepareSubChunkUpDownRenders(chunkX, chunkY, blocks, shadows);
        this.prepareSubChunkUpDownRenders(chunkX + 1, chunkY, blocks, shadows);
    };

    renderBlockAt(x: number, y: number) {
        this.getSubChunkAt(x, y)?.renderBlock(x & ChunkLengthN, y & ChunkLengthN);
    };

    renderShadowAt(x: number, y: number) {
        this.getSubChunkAt(x, y)?.renderShadow(x & ChunkLengthN, y & ChunkLengthN);
    };

    setChunkBuffer(_: number, __: Buffer) {
        throw new Error("Report a bug if you see this.");
    };

    getChunkBuffer(_: number): Buffer | null {
        throw new Error("Report a bug if you see this.");
    };
}