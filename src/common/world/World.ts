import {f2id, im2f, ItemMetadata} from "../meta/Items";
import {B, BM, I, IM} from "../meta/ItemIds";
import {BoundingBox} from "../entity/BoundingBox";
import {Generator} from "./generators/Generator";
import {Entity} from "../entity/Entity";
import {FlatGenerator} from "./generators/FlatGenerator";
import {DefaultGenerator} from "./generators/DefaultGenerator";
import {FlowerLandGenerator} from "./generators/FlowerLandGenerator";
import {CustomGenerator} from "./generators/CustomGenerator";
import {Server} from "../Server";
import {CHUNK_LENGTH, CHUNK_LENGTH_BITS, CHUNK_LENGTH_N, ServerChunkStruct, WORLD_HEIGHT, zstd} from "../utils/Utils";

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
    chunkEntities: Record<number, EntityType[]> = {};
    chunkReferees: Record<number, number> = {};
    server: ServerType;
    entities: Record<number, EntityType> = {};
    dirtyChunks: Set<number> = new Set;

    constructor(
        public server: ServerType,
        public name: string,
        public path: string,
        public seed: number,
        public generator: Generator,
        public chunksGenerated: Set<number>
    ) {
        if (generator) generator.setWorld(this);
        for (let x = -2; x <= 2; x++) {
            this.ensureChunk(x);
        }
    };

    getPlayers() {
        return <ServerType["__player_type__"][]>Array.from(this.server.players).filter(i => i.world === this);
    };

    // Finds the first air block from bottom
    getLowHeight(x: number) {
        x = Math.round(x);
        const chunk = this.getFullChunkAt(x);
        const xs = x & 0b1111;
        let i = xs;
        while (!BM[chunk[i]].canBePhased) i += CHUNK_LENGTH;
        return (i - xs) / CHUNK_LENGTH;
    };

    // Finds the last air block from top
    getHighHeight(x: number) {
        x = Math.round(x);
        const chunk = this.getFullChunkAt(x);
        const xs = x & CHUNK_LENGTH_N; // chunk length - 1
        let i = xs | ((WORLD_HEIGHT - 1) << CHUNK_LENGTH_BITS);
        while (BM[chunk[i]].canBePhased && i > 0) i -= CHUNK_LENGTH;
        return (i - xs) / CHUNK_LENGTH + 1;
    };

    getFullChunkAt(x: number, generate = true) {
        x = Math.round(x) >> CHUNK_LENGTH_BITS;
        this.ensureChunk(x, generate);
        return this.chunks[x];
    };

    getChunkEntitiesAt(x: number): EntityType[] {
        x = Math.round(x) >> CHUNK_LENGTH_BITS;
        return this.chunkEntities[x] ??= [];
    };

    getBlockAt(x: number, y: number): number {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(x, y)) return 0;
        return this.getFullChunkAt(x, true)[(x & CHUNK_LENGTH_N) | (y << CHUNK_LENGTH_BITS)];
    };

    getBlockMetaAt(x: number, y: number): ItemMetadata {
        return BM[this.getBlockAt(x, y)];
    };

    inWorld(x: number, y: number) {
        return y < WORLD_HEIGHT && y >= 0;
    };

    _setBlock(x: number, y: number, fullId: number, generate = true, polluteChunk = true, broadcast = true) {
        // WARNING: This assumes x and y are integers, and y is a bounded valid height.
        const chunk = this.getFullChunkAt(x, generate);
        const i = (x & CHUNK_LENGTH_N) | (y << CHUNK_LENGTH_BITS);
        if (chunk[i] === fullId) return;
        chunk[i] = fullId;
        const chunkX = x >> CHUNK_LENGTH_BITS;
        if (polluteChunk) this.dirtyChunks.add(chunkX);
        if (broadcast) this.broadcastBlockAt(x, y, fullId);
    };

    setFullBlock(x: number, y: number, fullId: number, generate = true, polluteChunk = true, broadcast = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(x, y)) return;
        this._setBlock(x, y, fullId, generate, polluteChunk, broadcast);
    };

    setBlock(x: number, y: number, id: number, meta: number, generate = true, polluteChunk = true, broadcast = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(x, y)) return;
        this._setBlock(x, y, im2f(id, meta), generate, polluteChunk, broadcast);
    };

    ensureChunk(x: number, generate = true) {
        x = Math.round(x);
        if (!(x in this.chunks)) this.loadChunk(x);
        if (!(x in this.chunks)) this.chunks[x] = new Uint16Array(CHUNK_LENGTH * WORLD_HEIGHT);

        this.chunkEntities[x] ??= [];

        if (generate && this.generator && !this.chunksGenerated.has(x)) {
            this.chunksGenerated.add(x);
            this.generator.generate(x);
            this.dirtyChunks.add(x);
        }
    };

    loadChunk(x: number) {
        const buffer = this.getChunkBuffer(x);
        if (!buffer) return false;
        try {
            const chunk = ServerChunkStruct.deserialize(Buffer.from(zstd.decode(buffer)));
            this.chunks[x] = chunk.data;
        } catch (e) {
            console.warn(`Chunk ${x} is corrupted, regenerating...`, e);
            this.removeChunkBuffer(x);
            return false;
        }
        return true;
    };

    saveChunk(x: number) {
        if (!this.chunksGenerated.has(x)) return;
        const buffer = zstd.encode(ServerChunkStruct.serialize({data: this.chunks[x]}));
        this.setChunkBuffer(x, buffer);
    };

    abstract removeChunkBuffer(x: number): void; // for removing corrupted chunks

    abstract getChunkBuffer(x: number): Buffer | null;

    abstract setChunkBuffer(x: number, buffer: Buffer): void;

    serverUpdate(dt: number): void {
        for (const x in this.chunkEntities) {
            this.chunkEntities[x].forEach(e => e.serverUpdate(dt));
        }
    };

    save() {
        for (let x of this.dirtyChunks) {
            this.saveChunk(x);
        }
        this.dirtyChunks.clear();
    };

    unload() {
        for (let x in this.chunks) {
            this.unloadChunk(parseInt(x));
        }
    };

    unloadChunk(x: number) {
        this.saveChunk(x);
        delete this.chunks[x];
        delete this.chunkEntities[x];
    };

    tryToPlaceBlockAt(entity: EntityType, x: number, y: number, id: number, meta: number, polluteChunk = true, broadcast = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(x, y) || entity.distance(x, y) > entity.blockReach || !this.hasSurroundingBlock(x, y)) return false;
        const targetFullId = this.getBlockAt(x, y);
        const targetId = f2id(targetFullId);
        const targetMeta = IM[targetId];
        const replaceableBy = targetMeta.replaceableBy;
        if (replaceableBy !== "*" && !replaceableBy.includes(id)) return false;
        const canBePlacedOn = targetMeta.canBePlacedOn;
        if (canBePlacedOn !== "*" && !canBePlacedOn.includes(id)) return false;
        if (targetMeta.cannotBePlacedOn.includes(id)) return false;
        const fullId = im2f(id, meta);
        this._setBlock(x, y, fullId, true, false);
        if (this.anyEntityTouchBlock(x, y)) {
            this._setBlock(x, y, targetFullId, true, false);
            return false;
        }
        const chunkX = x >> CHUNK_LENGTH_BITS;
        if (polluteChunk) this.dirtyChunks.add(chunkX);
        if (broadcast) this.broadcastBlockAt(x, y, fullId);
        return true;
    };

    canBreakBlockAt(entity: EntityType, x: number, y: number) {
        x = Math.round(x);
        y = Math.round(y);
        const fullId = this.getBlockAt(x, y);
        const id = f2id(fullId);
        const data = IM[id];
        return this.inWorld(x, y)
            && entity.distance(x, y) <= entity.blockReach
            && this.getBlockDepth(x, y) >= 3
            && data.getHardness() !== -1
            && data.solid;
    };

    tryToBreakBlockAt(entity: EntityType, x: number, y: number, polluteChunk = true, broadcast = true) {
        if (!this.canBreakBlockAt(entity, x, y)) return false;
        this.setFullBlock(x, y, B.AIR, true, polluteChunk, broadcast);
        return true;
    };

    anyEntityTouchBlock(x: number, y: number) {
        const cx = Math.round(x) >> 4;
        for (let chunkX = cx - 1; chunkX <= cx + 1; chunkX++) {
            const entities = this.chunkEntities[chunkX];
            for (const e of entities) {
                if (e.bb.collidesBlock(x, y)) return true;
            }
        }
        return false;
    };

    getBlockCollisions(bb: BoundingBox, limit = Infinity) {
        const collisions = [];
        for (let x = Math.floor(bb.x); x <= Math.ceil(bb.x + bb.width); x++) {
            for (let y = Math.floor(bb.y); y <= Math.ceil(bb.y + bb.height); y++) {
                if (!this.getBlockMetaAt(x, y).canBePhased && bb.collidesBlock(x, y)) { // TODO: check for collision after adding slabs etc.
                    collisions.push({x, y});
                    if (collisions.length >= limit) return collisions;
                }
            }
        }
        return collisions;
    };

    hasSurroundingBlock(x: number, y: number) {
        return f2id(this.getBlockAt(x - 1, y)) !== I.AIR ||
            f2id(this.getBlockAt(x + 1, y)) !== I.AIR ||
            f2id(this.getBlockAt(x, y - 1)) !== I.AIR ||
            f2id(this.getBlockAt(x, y + 1)) !== I.AIR;
    };

    getBlockDepth(x: number, y: number, careOpaque = false) {
        const targetFullId = this.getBlockAt(x, y);
        if (careOpaque) {
            if (!BM[targetFullId].isOpaque) return 4;
        } else if (targetFullId === B.AIR) return 4;
        for (const [dx, dy] of SPREAD1) {
            if (!this.getBlockMetaAt(x + dx, y + dy).isOpaque) return 3;
        }
        for (const [dx, dy] of SPREAD2) {
            if (!this.getBlockMetaAt(x + dx, y + dy).isOpaque) return 2;
        }
        for (const [dx, dy] of SPREAD3) {
            if (!this.getBlockMetaAt(x + dx, y + dy).isOpaque) return 1;
        }
        return 0;
    };

    abstract playSound(path: string, x: number, y: number): void;

    broadcastBlockAt(x: number, y: number, fullId = null, exclude: any[] = [], immediate = false) {
    };
}