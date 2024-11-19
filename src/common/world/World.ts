import {im2f, ItemMetadata} from "../meta/Items";
import {B, BM, I} from "../meta/ItemIds";
import {BoundingBox} from "../entity/BoundingBox";
import {Generator} from "./generators/Generator";
import {FlatGenerator} from "./generators/FlatGenerator";
import {DefaultGenerator} from "./generators/DefaultGenerator";
import {FlowerLandGenerator} from "./generators/FlowerLandGenerator";
import {CustomGenerator} from "./generators/CustomGenerator";
import {
    ChunkLength,
    ChunkLengthBits,
    ChunkLengthN,
    WorldHeight,
    zstdOptionalDecode,
    zstdOptionalEncode
} from "../utils/Utils";
import {Player} from "../entity/types/Player";
import {Packet} from "../network/Packet";
import {Entity} from "../entity/Entity";
import {Server} from "../Server";
import {Packets} from "../network/Packets";
import ChunkStruct from "../structs/ChunkStruct";

export function getRandomSeed() {
    return Math.floor(Math.random() * 100000000);
}

export const Ring1 = [
    [1, 0], [0, 1], [-1, 0], [0, -1]
];

export const Ring2 = [
    [2, 0], [1, 1], [0, 2], [-1, 1], [-2, 0], [-1, -1], [0, -2], [1, -1]
];

export const Ring3 = [
    [3, 0], [2, 1], [1, 2], [0, 3], [-1, 2], [-2, 1], [-3, 0], [-2, -1], [-1, -2], [0, -3], [1, -2], [2, -1]
];

export type ChunkData = Uint16Array;
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

// Variable meanings:
// x = World X
// y = World Y
// chunkX = A chunk's X position
// chunkX = A sub-chunk's Y position
// relX = The chunk-relative x position that goes from 0 to CHUNK_LENGTH-1
// relY = The chunk-relative y position that goes from 0 to CHUNK_LENGTH-1

export class World {
    path: string;
    chunks: Record<number, ChunkData> = {};
    chunkEntities: Record<number, Entity[]> = {};
    chunkReferees: Record<number, number> = {};
    entities: Record<number, Entity> = {};
    dirtyChunks = new Set<number>;

    constructor(
        public server: Server,
        public name: string,
        public folder: string,
        public seed: number,
        public generator: Generator,
        public chunksGenerated: Set<number>
    ) {
        if (generator) generator.setWorld(this);
        this.path = server.path + "/worlds/" + folder;
    };

    ensureSpawnChunks() {
        for (let x = -2; x <= 2; x++) {
            this.ensureChunk(x);
        }
    };

    getPlayers() {
        return <Player[]>Object.values(this.server.players).filter(p => p.world === this);
    };

    // Finds the first air block from bottom
    getLowHeight(x: number) {
        x = Math.round(x);
        const chunk = this.getFullChunkAt(x);
        const xs = x & 0b1111;
        let i = xs;
        while (!BM[chunk[i]].canBePhased) i += ChunkLength;
        return (i - xs) / ChunkLength;
    };

    // Finds the last air block from top
    getHighHeight(x: number) {
        x = Math.round(x);
        const chunk = this.getFullChunkAt(x);
        const xs = x & ChunkLengthN; // chunk length - 1
        let i = xs | ((WorldHeight - 1) << ChunkLengthBits);
        while (BM[chunk[i]].canBePhased && i > 0) i -= ChunkLength;
        return (i - xs) / ChunkLength + 1;
    };

    getFullChunkAt(x: number, generate = true) {
        x = Math.round(x) >> ChunkLengthBits;
        this.ensureChunk(x, generate);
        return this.chunks[x];
    };

    getChunkEntitiesAt(x: number): Entity[] {
        x = Math.round(x) >> ChunkLengthBits;
        return this.chunkEntities[x] ??= [];
    };

    getBlock(x: number, y: number) {
        return BM[this.getFullBlockAt(x, y)];
    };

    getFullBlockAt(x: number, y: number) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(y)) return 0;
        return this.getFullChunkAt(x, true)[(x & ChunkLengthN) | (y << ChunkLengthBits)];
    };

    inWorld(y: number) {
        return y < WorldHeight && y >= 0;
    };

    _setBlock(x: number, y: number, fullId: number, generate = true, polluteChunk = true, broadcast = true) {
        // WARNING: This assumes x and y are integers, and y is a bounded valid height.
        const chunk = this.getFullChunkAt(x, generate);
        const i = (x & ChunkLengthN) | (y << ChunkLengthBits);
        if (chunk[i] === fullId) return false;
        chunk[i] = fullId;
        if (polluteChunk) this._polluteBlockAt(x, y);
        if (broadcast) this.broadcastBlockAt(x, y, fullId); // the promise doesn't matter.
        return true;
    };

    setFullBlock(x: number, y: number, fullId: number, generate = true, polluteChunk = true, broadcast = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(y)) return;
        this._setBlock(x, y, fullId, generate, polluteChunk, broadcast);
    };

    setBlock(x: number, y: number, id: number, meta: number, generate = true, polluteChunk = true, broadcast = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(y)) return;
        this._setBlock(x, y, im2f(id, meta), generate, polluteChunk, broadcast);
    };


    /**
     * Ensures that the chunk exists. If it exists as a file it will be loaded, otherwise it will be generated.
     */
    ensureChunk(chunkX: number, generate = true) {
        if (this.loadChunk(chunkX)) return;
        this.chunks[chunkX] ??= new Uint16Array(ChunkLength * WorldHeight);

        this.chunkEntities[chunkX] ??= [];

        if (generate && this.generator && !this.chunksGenerated.has(chunkX)) {
            this.chunksGenerated.add(chunkX);
            this.generator.generate(chunkX);
            this._polluteChunk(chunkX);
        }
    };

    loadChunk(x: number) {
        if (x in this.chunks) return false;
        let buffer = this.getChunkBuffer(x);
        if (!buffer) return false;
        try {
            buffer = zstdOptionalDecode(buffer);
            const chunk = ChunkStruct.deserialize(buffer);
            this.chunks[x] = chunk.data;
            this.chunksGenerated.add(x);
            for (const viewer of this.getChunkViewers(x)) {
                this.sendChunk(viewer, x);
            }
        } catch (e) {
            printer.warn(`Chunk ${x} is corrupted, regenerating...`, e);
            this.chunksGenerated.delete(x);
            this.removeChunkBuffer(x);
            return false;
        }
        return true;
    };

    saveChunk(x: number) {
        if (!this.chunksGenerated.has(x)) return;
        const buffer = ChunkStruct.serialize({data: this.chunks[x]});
        this.setChunkBuffer(x, zstdOptionalEncode(buffer));
    };

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

    _polluteChunk(chunkX: number) {
        this.dirtyChunks.add(chunkX);
    };

    _polluteBlockAt(x: number, _y: number) {
        this._polluteChunk(x >> ChunkLengthBits);
    };

    tryToPlaceBlockAt(entity: Entity, x: number, y: number, id: number, meta: number, polluteChunk = true, broadcast = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (
            !this.inWorld(y)
            || entity.distance(x, y) > entity.getBlockReach()
            || !this.hasSurroundingBlock(x, y)
        ) return false;
        const target = this.getBlock(x, y);
        const replaceableBy = target.replaceableBy;
        if (replaceableBy !== "*" && !replaceableBy.includes(id)) return false;
        const canBePlacedOn = target.canBePlacedOn;
        if (canBePlacedOn !== "*" && !canBePlacedOn.includes(id)) return false;
        if (target.cannotBePlacedOn.includes(id)) return false;
        const fullId = im2f(id, meta);
        this._setBlock(x, y, fullId, true, false);
        if (this.anyEntityTouchBlock(x, y)) {
            this._setBlock(x, y, target.fullId, true, false);
            return false;
        }
        if (polluteChunk) this._polluteBlockAt(x, y);
        if (broadcast) this.broadcastBlockAt(x, y, fullId);
        return true;
    };

    canBreakBlockAt(entity: Entity, x: number, y: number) {
        x = Math.round(x);
        y = Math.round(y);
        const target = this.getBlock(x, y);
        return this.inWorld(y)
            && entity.distance(x, y) <= entity.getBlockReach()
            && this.getBlockDepth(x, y) >= 3
            && target.getHardness() !== -1
            && target.solid;
    };

    tryToBreakBlockAt(entity: Entity, x: number, y: number, polluteChunk = true, broadcast = true) {
        if (!this.canBreakBlockAt(entity, x, y)) return false;
        this.setFullBlock(x, y, B.AIR, true, polluteChunk, broadcast);
        return true;
    };

    anyEntityTouchBlock(x: number, y: number) {
        const chunkXMiddle = Math.round(x) >> ChunkLengthBits;
        for (let chunkX = chunkXMiddle - 1; chunkX <= chunkXMiddle + 1; chunkX++) {
            for (const e of this.chunkEntities[chunkX]) {
                if (e.bb.collidesBlock(x, y)) return true;
            }
        }
        return false;
    };

    getBlockCollisions(bb: BoundingBox, limit = Infinity) {
        const collisions: { x: number, y: number, block: ItemMetadata }[] = [];
        for (let x = Math.floor(bb.x); x <= Math.ceil(bb.x + bb.width); x++) {
            for (let y = Math.floor(bb.y); y <= Math.ceil(bb.y + bb.height); y++) {
                const block = this.getBlock(x, y);
                if (!block.canBePhased && bb.collidesBlock(x, y)) { // TODO: check for collision after adding slabs etc.
                    collisions.push({x, y, block});
                    if (collisions.length >= limit) return collisions;
                }
            }
        }
        return collisions;
    };

    hasSurroundingBlock(x: number, y: number) {
        return this.getFullBlockAt(x - 1, y) !== B.AIR ||
            this.getFullBlockAt(x + 1, y) !== B.AIR ||
            this.getFullBlockAt(x, y - 1) !== B.AIR ||
            this.getFullBlockAt(x, y + 1) !== B.AIR;
    };

    getBlockDepth(x: number, y: number, careOpaque = false) {
        const target = this.getBlock(x, y);
        if (careOpaque) {
            if (!target.isOpaque) return 4;
        } else if (target.id === I.AIR) return 4;
        for (const [dx, dy] of Ring1) {
            if (!this.getBlock(x + dx, y + dy).isOpaque) return 3;
        }
        for (const [dx, dy] of Ring2) {
            if (!this.getBlock(x + dx, y + dy).isOpaque) return 2;
        }
        for (const [dx, dy] of Ring3) {
            if (!this.getBlock(x + dx, y + dy).isOpaque) return 1;
        }
        return 0;
    };

    playSound(path: string, x: number, y: number) {
        this.broadcastPacketAt(x, new Packets.SPlaySound({path, x, y}));
    };

    getChunkBuffer(chunkX: number): Buffer | null {
        const path = this.path + "/chunks/" + chunkX + ".dat";
        if (!this.server.fileExists(path)) return null;
        return this.server.readFile(path);
    };

    setChunkBuffer(chunkX: number, buffer: Buffer) {
        this.server.createDirectory(this.path + "/chunks");
        this.server.writeFile(this.path + "/chunks/" + chunkX + ".dat", buffer);
    };

    removeChunkBuffer(x: number) {
        this.server.deleteFile(this.path + "/chunks/" + x + ".dat");
    };

    getChunkViewers(chunkXMiddle: number) {
        const players: Player[] = [];
        for (let chunkX = chunkXMiddle - 2; chunkX <= chunkXMiddle + 2; chunkX++) {
            const entities = this.chunkEntities[chunkX] ??= [];
            for (const entity of entities) {
                if (entity instanceof Player) players.push(entity);
            }
        }
        return players;
    };

    broadcastPacketAt(x: number, pk: Packet, exclude: Player[] = [], immediate = false) {
        const chunkX = x >> ChunkLengthBits;
        for (const player of this.getChunkViewers(chunkX)) {
            if (!exclude.includes(player)) player.network.sendPacket(pk, immediate);
        }
    };

    broadcastBlockAt(x: number, y: number, fullId = null, exclude: Player[] = [], immediate = false) {
        if (this.server.isClientSide()) return;
        const chunkX = x >> ChunkLengthBits;
        fullId ??= this.getFullBlockAt(x, y);
        for (const player of this.getChunkViewers(chunkX)) {
            if (!exclude.includes(player)) player.network.sendBlock(x, y, fullId, immediate);
        }
    };

    sendChunk(player: Player, chunkX: number) {
        this.ensureChunk(chunkX);
        const chunk = this.chunks[chunkX];
        const entities = this.chunkEntities[chunkX].filter(i => i !== player).map(i => ({
            entityId: i.id, typeId: i.typeId, props: i.getSpawnData()
        }));
        player.network.sendPacket(new Packets.SChunk({
            x: chunkX, data: chunk, entities, resetEntities: true
        }), true);
    };
}