import World, {Ring1} from "@/world/World";
import CSubChunk from "@c/world/CSubChunk";
import Packet from "@/network/Packet";
import Player from "@/entity/defaults/Player";
import {SubChunkAmount} from "@/meta/WorldConstants";
import {x2cx, x2rx, y2cy, y2ry} from "@/utils/Utils";

export default class CWorld extends World {
    isClient = true;
    subChunkRenders: Record<number, CSubChunk[]> = {};

    broadcastPacketAt(_0: number, _1: Packet, _2: Player[] = [], _3: boolean = false) {
    };

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

        this.prepareBlockRenderAt(x, y);

        const block = this.getBlock(x, y);

        for (const [dx, dy] of Ring1) {
            this.prepareBlockRenderAt(x + dx, y + dy, !block.isOpaque, true);
        }
    };

    getSubChunk(chunkX: number, chunkY: number) {
        return this.subChunkRenders[chunkX]?.[chunkY];
    };

    getSubChunkAt(x: number, y: number) {
        return this.getSubChunk(x2cx(x), y2cy(y));
    };

    updateBlockAt() {
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

    prepareBlockRenderAt(x: number, y: number, blocks = true, shadows = true) {
        this.getSubChunkAt(x, y)?.prepareBlock(x2rx(x), y2ry(y), blocks, shadows);
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

    onUpdateLight(x: number, y: number) {
        this.prepareBlockRenderAt(x, y);
    };

    setChunkBuffer(_: number, __: Buffer) {
        throw new Error("Report a bug if you see this.");
    };

    getChunkBuffer(_: number): Buffer | null {
        throw new Error("Report a bug if you see this.");
    };
}