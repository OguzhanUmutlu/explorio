import {im2f} from "../meta/Items";
import {B, BM, I} from "../meta/ItemIds";
import {BoundingBox} from "../entity/BoundingBox";
import {Generator} from "./generators/Generator";
import {FlatGenerator} from "./generators/FlatGenerator";
import {DefaultGenerator} from "./generators/DefaultGenerator";
import {FlowerLandGenerator} from "./generators/FlowerLandGenerator";
import {CustomGenerator} from "./generators/CustomGenerator";
import {
    CHUNK_LENGTH,
    CHUNK_LENGTH_BITS,
    CHUNK_LENGTH_N,
    ChunkStruct,
    WORLD_HEIGHT,
    zstdOptionalDecode,
    zstdOptionalEncode
} from "../utils/Utils";
import {Player} from "../entity/types/Player";
import {SPlaySoundPacket} from "../packet/server/SPlaySoundPacket";
import {Packet} from "../packet/Packet";
import {SChunkPacket} from "../packet/server/SChunkPacket";
import {Entity} from "../entity/Entity";
import {Server} from "../Server";

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

export class World {
    path: string;
    chunks: Record<number, Chunk> = {};
    chunkEntities: Record<number, Entity[]> = {};
    chunkReferees: Record<number, number> = {};
    server: Server;
    entities: Record<number, Entity> = {};
    dirtyChunks: Set<number> = new Set;

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

    getChunkEntitiesAt(x: number): Entity[] {
        x = Math.round(x) >> CHUNK_LENGTH_BITS;
        return this.chunkEntities[x] ??= [];
    };

    getBlock(x: number, y: number) {
        return BM[this.getFullBlockAt(x, y)];
    };

    getFullBlockAt(x: number, y: number) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(x, y)) return 0;
        return this.getFullChunkAt(x, true)[(x & CHUNK_LENGTH_N) | (y << CHUNK_LENGTH_BITS)];
    };

    inWorld(x: number, y: number) {
        return y < WORLD_HEIGHT && y >= 0;
    };

    _setBlock(x: number, y: number, fullId: number, generate = true, polluteChunk = true, broadcast = true) {
        // WARNING: This assumes x and y are integers, and y is a bounded valid height.
        const chunk = this.getFullChunkAt(x, generate);
        const i = (x & CHUNK_LENGTH_N) | (y << CHUNK_LENGTH_BITS);
        if (chunk[i] === fullId) return false;
        chunk[i] = fullId;
        const chunkX = x >> CHUNK_LENGTH_BITS;
        if (polluteChunk) this.dirtyChunks.add(chunkX);
        if (broadcast) this.broadcastBlockAt(x, y, fullId);
        return true;
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
        if (!(x in this.chunks)) this.loadChunk(x).then(r => r); // should not wait for it to load
        this.chunks[x] ??= new Uint16Array(CHUNK_LENGTH * WORLD_HEIGHT);

        this.chunkEntities[x] ??= [];

        if (generate && this.generator && !this.chunksGenerated.has(x)) {
            this.chunksGenerated.add(x);
            this.generator.generate(x);
            this.dirtyChunks.add(x);
        }
    };

    async loadChunk(x: number) {
        let buffer = await this.getChunkBuffer(x);
        if (!buffer) return false;
        try {
            buffer = zstdOptionalDecode(buffer);
            const chunk = ChunkStruct.deserialize(buffer);
            this.chunks[x] = chunk.data;
            this.chunksGenerated.add(x);
        } catch (e) {
            printer.warn(`Chunk ${x} is corrupted, regenerating...`, e);
            this.chunksGenerated.delete(x);
            await this.removeChunkBuffer(x);
            return false;
        }
        return true;
    };

    async saveChunk(x: number) {
        if (!this.chunksGenerated.has(x)) return;
        const buffer = ChunkStruct.serialize({data: this.chunks[x]});
        await this.setChunkBuffer(x, zstdOptionalEncode(buffer));
    };

    serverUpdate(dt: number): void {
        for (const x in this.chunkEntities) {
            this.chunkEntities[x].forEach(e => e.serverUpdate(dt));
        }
    };

    async save() {
        for (let x of this.dirtyChunks) {
            await this.saveChunk(x);
        }
        this.dirtyChunks.clear();
    };

    async unload() {
        for (let x in this.chunks) {
            await this.unloadChunk(parseInt(x));
        }
    };

    async unloadChunk(x: number) {
        await this.saveChunk(x);
        delete this.chunks[x];
        delete this.chunkEntities[x];
    };

    tryToPlaceBlockAt(entity: Entity, x: number, y: number, id: number, meta: number, polluteChunk = true, broadcast = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (
            !this.inWorld(x, y)
            || ("blockReach" in entity && entity.distance(x, y) > entity.blockReach)
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
        const chunkX = x >> CHUNK_LENGTH_BITS;
        if (polluteChunk) this.dirtyChunks.add(chunkX);
        if (broadcast) this.broadcastBlockAt(x, y, fullId);
        return true;
    };

    canBreakBlockAt(entity: Entity, x: number, y: number) {
        x = Math.round(x);
        y = Math.round(y);
        const target = this.getBlock(x, y);
        return this.inWorld(x, y)
            && (!("blockReach" in entity) || entity.distance(x, y) <= entity.blockReach)
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
        const cx = Math.round(x) >> CHUNK_LENGTH_BITS;
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
                if (!this.getBlock(x, y).canBePhased && bb.collidesBlock(x, y)) { // TODO: check for collision after adding slabs etc.
                    collisions.push({x, y});
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
        for (const [dx, dy] of SPREAD1) {
            if (!this.getBlock(x + dx, y + dy).isOpaque) return 3;
        }
        for (const [dx, dy] of SPREAD2) {
            if (!this.getBlock(x + dx, y + dy).isOpaque) return 2;
        }
        for (const [dx, dy] of SPREAD3) {
            if (!this.getBlock(x + dx, y + dy).isOpaque) return 1;
        }
        return 0;
    };

    playSound(path: string, x: number, y: number): void {
        this.broadcastPacketAt(x, y, new SPlaySoundPacket({path, x, y}));
    };

    async getChunkBuffer(x: number): Promise<Buffer | null> {
        const path = this.path + "/chunks/" + x + ".dat";
        if (!await this.server.fs.existsSync(path)) return null;
        return await this.server.fs.readFileSync(path);
    };

    async setChunkBuffer(x: number, buffer: Buffer) {
        await this.server.fs.mkdirSync(this.path + "/chunks", {recursive: true, mode: 0o777});
        await this.server.fs.writeFileSync(this.path + "/chunks/" + x + ".dat", buffer);
    };

    async removeChunkBuffer(x: number) {
        await this.server.fs.rmSync(this.path + "/chunks/" + x + ".dat");
    };

    getChunkViewers(chunkX: number) {
        const players: Player[] = [];
        for (let cx = chunkX - 2; cx <= chunkX + 2; cx++) {
            const entities = this.chunkEntities[cx] ??= [];
            for (const entity of entities) {
                if (entity instanceof Player) players.push(entity);
            }
        }
        return players;
    };

    broadcastPacketAt(x: number, y: number, pk: Packet<any>, exclude: Player[] = [], immediate = false) {
        const chunkX = x >> CHUNK_LENGTH_BITS;
        for (const player of this.getChunkViewers(chunkX)) {
            if (!exclude.includes(player)) player.network.sendPacket(pk, immediate);
        }
    };

    broadcastBlockAt(x: number, y: number, fullId = null, exclude: Player[] = [], immediate = false) {
        if (this.server.isClientSide()) return;
        const chunkX = x >> CHUNK_LENGTH_BITS;
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
        player.network.sendPacket(new SChunkPacket({
            x: chunkX, data: chunk, entities, resetEntities: true
        }), true);
    };
}