import {BlockCanBePhased, BlockIsOpaque, ItemIds} from "../Items";
import {BoundingBox} from "../BoundingBox";
import {Generator} from "./generators/Generator";
import {Entity} from "../entity/Entity";
import {FlatGenerator} from "./generators/FlatGenerator";
import {DefaultGenerator} from "./generators/DefaultGenerator";
import {FlowerLandGenerator} from "./generators/FlowerLandGenerator";
import {CustomGenerator} from "./generators/CustomGenerator";
import {deserializeUint16Array, serializeUint16Array} from "../Utils";
import {Buffer, BufferType} from "../compound/Tag";
import {Server} from "../Server";

export const WORLD_HEIGHT = 512;
export const CHUNK_LENGTH = 16;
export const SURFACE_HEIGHT = 172;
export const CAVE_SCALE = 40;
export const CHUNK_BUFFER_SIZE = CHUNK_LENGTH * WORLD_HEIGHT * 2;

export function getRandomSeed() {
    return Math.floor(Math.random() * 100000000);
}

export const SPREAD1 = [
    [1, 0], [0, 1], [-1, 0], [0, -1]
];

export const SPREAD2 = [
    [2, 0], [1, 1], [0, 2], [-1, 1], [-2, 0], [-1, -1], [0, -2], [1, -1]
];

export const SPREAD3 = [
    [3, 0], [2, 1], [1, 2], [0, 3], [-1, 2], [-2, 1], [-3, 0], [-2, -1], [-1, -2], [0, -3], [1, -2], [2, -1]
];

export type Chunk = Uint16Array;
export type WorldMetaData = {
    name: string,
    seed: number,
    generator: keyof typeof Generators,
    generatorOptions: string
};

export const Generators = {
    flat: FlatGenerator,
    default: DefaultGenerator,
    flower_lands: FlowerLandGenerator,
    custom: CustomGenerator
} as const;

export abstract class World<EntityType extends Entity = Entity, ServerType extends Server = Server> {
    chunks: Record<number, Chunk> = {};
    metaChunks: Record<number, Chunk> = {};
    chunkEntities: Record<number, Set<EntityType>> = {};
    chunkReferees: Record<number, number> = {};
    server: ServerType;

    constructor(
        public server: ServerType,
        public name: string,
        public path: string,
        public seed: number,
        public generator: Generator,
        public chunksGenerated: Set<number>
    ) {
        this.generator.setWorld(this);
        for (let x = -2; x <= 2; x++) {
            this.ensureChunk(x);
        }
    };

    // Finds the first air block from bottom
    getLowHeight(x: number) {
        x = Math.round(x);
        const chunk = this.getChunkAt(x);
        const xs = x & 0xf;
        let i = xs;
        while (chunk[i] !== ItemIds.AIR) i += CHUNK_LENGTH;
        return (i - xs) / CHUNK_LENGTH;
    };

    // Finds the first air block from top
    getHighHeight(x: number) {
        x = Math.round(x);
        const chunk = this.getChunkAt(x);
        const xs = x & 0xf;
        let i = xs + (WORLD_HEIGHT - 1) * CHUNK_LENGTH;
        while (chunk[i] === ItemIds.AIR) i -= CHUNK_LENGTH;
        return (i - xs) / CHUNK_LENGTH;
    };

    getChunkAt(x: number, generate = true) {
        x = Math.round(x) >> 4;
        this.ensureChunk(x, generate);
        return this.chunks[x];
    };

    getChunkMetaAt(x: number, generate = true) {
        x = Math.round(x) >> 4;
        this.ensureChunk(x, generate);
        return this.metaChunks[x];
    };

    getChunkEntitiesAt(x: number): Set<EntityType> {
        x = Math.round(x) >> 4;
        return this.chunkEntities[x] ??= new Set;
    };

    getBlock(x: number, y: number): { id: number, meta: number } {
        x = Math.round(x);
        y = Math.round(y);
        if (y >= WORLD_HEIGHT || y < 0) return {id: ItemIds.AIR, meta: 0};
        return {
            id: this.getChunkAt(x)[(x & 0xf) + y * CHUNK_LENGTH],
            meta: this.getChunkMetaAt(x)[(x & 0xf) + y * CHUNK_LENGTH]
        };
    }

    getBlockId(x: number, y: number): number {
        x = Math.round(x);
        y = Math.round(y);
        if (y >= WORLD_HEIGHT || y < 0) return ItemIds.AIR;
        return this.getChunkAt(x)[(x & 0xf) + y * CHUNK_LENGTH] ?? ItemIds.AIR;
    };

    getBlockMeta(x: number, y: number): number {
        x = Math.round(x);
        y = Math.round(y);
        if (y >= WORLD_HEIGHT || y < 0) return ItemIds.AIR;
        return this.getChunkMetaAt(x)[(x & 0xf) + y * CHUNK_LENGTH] ?? ItemIds.AIR;
    };

    setBlock(x: number, y: number, id: number, meta: number, generate = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (y >= WORLD_HEIGHT || y < 0) return ItemIds.AIR;
        this.getChunkAt(x, generate)[(x & 0xf) + y * CHUNK_LENGTH] = id;
        this.getChunkMetaAt(x, generate)[(x & 0xf) + y * CHUNK_LENGTH] = meta;
    };

    setBlockId(x: number, y: number, id: number, generate = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (y >= WORLD_HEIGHT || y < 0) return ItemIds.AIR;
        this.getChunkAt(x, generate)[(x & 0xf) + y * CHUNK_LENGTH] = id;
    };

    setBlockMeta(x: number, y: number, meta: number, generate = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (y >= WORLD_HEIGHT || y < 0) return ItemIds.AIR;
        this.getChunkMetaAt(x, generate)[(x & 0xf) + y * CHUNK_LENGTH] = meta;
    };

    ensureChunk(x: number, generate = true) {
        x = Math.round(x);
        if (!(x in this.chunks) || !(x in this.metaChunks)) this.loadChunk(x);
        if (!(x in this.chunks)) this.chunks[x] = new Uint16Array(CHUNK_LENGTH * WORLD_HEIGHT);
        if (!(x in this.metaChunks)) this.metaChunks[x] = new Uint16Array(CHUNK_LENGTH * WORLD_HEIGHT);

        if (generate && !this.chunksGenerated.has(x)) {
            this.chunksGenerated.add(x);
            this.generator.generate(x);
        }
    };

    loadChunk(x: number) {
        const buffer = this.getChunkBuffer(x);
        if (!buffer) return false;
        this.chunks[x] = deserializeUint16Array(CHUNK_BUFFER_SIZE, buffer, 0);
        this.metaChunks[x] = deserializeUint16Array(CHUNK_BUFFER_SIZE, buffer, CHUNK_BUFFER_SIZE - 2);
        return true;
    };

    saveChunk(x: number) {
        if (!this.chunksGenerated.has(x)) return;
        const buffer = Buffer.alloc(CHUNK_BUFFER_SIZE * 2);
        serializeUint16Array(this.chunks[x], buffer, 0);
        serializeUint16Array(this.metaChunks[x], buffer, CHUNK_BUFFER_SIZE);
        this.setChunkBuffer(x, buffer);
    };

    abstract getChunkBuffer(x: number): BufferType | null;

    abstract setChunkBuffer(x: number, buffer: BufferType): void;

    save() {
        for (let x in this.chunks) {
            this.saveChunk(parseInt(x));
        }
    };

    unload() {
        for (let x in this.chunks) {
            this.unloadChunk(parseInt(x));
        }
    };

    unloadChunk(x: number) {
        this.saveChunk(x);
        delete this.chunks[x];
        delete this.metaChunks[x];
    };

    getBlockCollisions(bb: BoundingBox, limit = Infinity) {
        const collisions = [];
        for (let x = Math.floor(bb.x); x <= Math.ceil(bb.x + bb.width); x++) {
            for (let y = Math.floor(bb.y); y <= Math.ceil(bb.y + bb.height); y++) {
                if (!BlockCanBePhased[this.getBlockId(x, y)] && bb.collidesBlock(x, y)) { // TODO: check for collision after adding slabs etc.
                    collisions.push({x, y});
                    if (collisions.length >= limit) return collisions;
                }
            }
        }
        return collisions;
    };

    hasSurroundingBlock(x: number, y: number) {
        return this.getBlockId(x - 1, y) !== ItemIds.AIR ||
            this.getBlockId(x + 1, y) !== ItemIds.AIR ||
            this.getBlockId(x, y - 1) !== ItemIds.AIR ||
            this.getBlockId(x, y + 1) !== ItemIds.AIR;
    };

    getBlockDepth(x: number, y: number) {
        if (!BlockIsOpaque[this.getBlockId(x, y)]) return 4;
        for (const [dx, dy] of SPREAD1) {
            if (!BlockIsOpaque[this.getBlockId(x + dx, y + dy)]) return 3;
        }
        for (const [dx, dy] of SPREAD2) {
            if (!BlockIsOpaque[this.getBlockId(x + dx, y + dy)]) return 2;
        }
        for (const [dx, dy] of SPREAD3) {
            if (!BlockIsOpaque[this.getBlockId(x + dx, y + dy)]) return 1;
        }
        return 0;
    };

    abstract playSound(path: string, x: number, y: number): void;
}