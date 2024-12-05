import {im2f, ItemMetadata} from "@/meta/Items";
import {B, BM, I} from "@/meta/ItemIds";
import BoundingBox from "@/entity/BoundingBox";
import Generator from "@/world/generators/Generator";
import FlatGenerator from "@/world/generators/FlatGenerator";
import DefaultGenerator from "@/world/generators/DefaultGenerator";
import FlowerLandGenerator from "@/world/generators/FlowerLandGenerator";
import CustomGenerator from "@/world/generators/CustomGenerator";
import {rotateMeta, zstdOptionalDecode, zstdOptionalEncode} from "@/utils/Utils";
import Player from "@/entity/types/Player";
import Packet from "@/network/Packet";
import Entity from "@/entity/Entity";
import Server from "@/Server";
import {Packets} from "@/network/Packets";
import ChunkStruct from "@/structs/world/ChunkStruct";
import {z} from "zod";
import {ChunkLength, ChunkLengthBits, ChunkLengthN, WorldHeight} from "@/meta/WorldConstants";
import {BlockPlaceEvent} from "@/event/types/BlockPlaceEvent";
import {BlockBreakEvent} from "@/event/types/BlockBreakEvent";
import ItemEntity from "@/entity/types/ItemEntity";
import Item from "@/item/Item";

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

export const All3Rings = [...Ring1, ...Ring2, ...Ring3];

export type ChunkData = Uint16Array;

export const Generators = {
    flat: FlatGenerator,
    default: DefaultGenerator,
    flower_lands: FlowerLandGenerator,
    custom: CustomGenerator
} as const;

type GeneratorKeys = keyof typeof Generators;

export const ZWorldMetaData = z.object({
    name: z.string(),
    seed: z.number().int(),
    generator: z.enum(<[GeneratorKeys, ...GeneratorKeys[]]>Object.keys(Generators)),
    generatorOptions: z.string()
});

export type WorldMetaData = z.infer<typeof ZWorldMetaData>;

export const DefaultWorldMetadata: WorldMetaData = {
    name: "world",
    seed: getRandomSeed(),
    generator: "default",
    generatorOptions: ""
};

export type Collision = { x: number, y: number, meta: ItemMetadata, bb: BoundingBox };

// Variable meanings:
// x = World X
// y = World Y
// chunkX = A chunk's X position
// chunkX = A sub-chunk's Y position
// relX = The chunk-relative x position that goes from 0 to CHUNK_LENGTH-1
// relY = The chunk-relative y position that goes from 0 to CHUNK_LENGTH-1

export default class World {
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
        x = x >> ChunkLengthBits;
        this.ensureChunk(x, generate);
        return this.chunks[x];
    };

    getChunkEntitiesAt(x: number): Entity[] {
        return this.chunkEntities[x >> ChunkLengthBits] ??= [];
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

    _setBlock(x: number, y: number, fullId: number, generate = true, polluteBlock = true, broadcast = true) {
        // WARNING: This assumes x and y are integers, and y is a bounded valid height.
        const chunk = this.getFullChunkAt(x, generate);
        const i = (x & ChunkLengthN) | (y << ChunkLengthBits);
        if (chunk[i] === fullId) return false;
        chunk[i] = fullId;
        if (polluteBlock) this._polluteBlockAt(x, y);
        if (broadcast) this.broadcastBlockAt(x, y, fullId); // the promise doesn't matter.
        return true;
    };

    setFullBlock(x: number, y: number, fullId: number, generate = true, polluteBlock = true, broadcast = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(y)) return;
        this._setBlock(x, y, fullId, generate, polluteBlock, broadcast);
    };

    setBlock(x: number, y: number, id: number, meta: number, generate = true, polluteBlock = true, broadcast = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(y)) return;
        this._setBlock(x, y, im2f(id, meta), generate, polluteBlock, broadcast);
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
            const existing = (this.chunkEntities[x] ??= []).filter(i => i instanceof Player);
            for (const entity of chunk.entities) {
                entity.world = this;
                entity.init();
            }
            this.chunkEntities[x].push(...existing);
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
        const buffer = ChunkStruct.serialize({
            data: this.chunks[x],
            entities: this.chunkEntities[x].filter(i => !(i instanceof Player))
        });
        this.setChunkBuffer(x, zstdOptionalEncode(buffer));
    };

    serverUpdate(dt: number): void {
        for (const x in this.chunkEntities) {
            this.chunkEntities[x].forEach(e => e.serverUpdate(dt));
        }
    };

    save() {
        for (const x of this.dirtyChunks) {
            this.saveChunk(x);
        }

        this.dirtyChunks.clear();
    };

    unload() {
        for (const x in this.chunks) {
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

    canPlaceBlockAt(entity: Entity, x: number, y: number, id: number, meta: number, rotation = 0) {
        x = Math.round(x);
        y = Math.round(y);
        meta = rotateMeta(id, meta, rotation);
        const fullId = im2f(id, meta);
        const block = BM[fullId];
        if (
            !this.inWorld(y)
            || entity.distance(x, y) > entity.getBlockReach()
            || !this.hasSurroundingBlock(x, y)
            || !block
            || !block.isBlock
        ) return false;
        const target = this.getBlock(x, y);
        const replaceableBy = target.replaceableBy;
        if (replaceableBy !== "*" && !replaceableBy.includes(id)) return false;
        const canBePlacedOn = target.canBePlacedOn;
        if (canBePlacedOn !== "*" && !canBePlacedOn.includes(id)) return false;
        if (target.cannotBePlacedOn.includes(id)) return false;

        this._setBlock(x, y, fullId, true, false, false);
        const touchingBlock = this.anyEntityTouchBlock(x, y);
        this._setBlock(x, y, target.fullId, true, false, false);

        return !touchingBlock;
    };

    tryToPlaceBlockAt(entity: Entity, x: number, y: number, id: number, meta: number, rotation = 0, polluteBlock = true, broadcast = true) {
        x = Math.round(x);
        y = Math.round(y);
        meta = rotateMeta(id, meta, rotation);
        if (!this.canPlaceBlockAt(entity, x, y, id, meta, rotation)) return false;

        const fullId = im2f(id, meta);
        const block = BM[fullId];
        const target = this.getBlock(x, y);
        this._setBlock(x, y, fullId, true, false, false);

        const cancelled = new BlockPlaceEvent(entity, x, y, block).emit();

        if (cancelled) {
            this._setBlock(x, y, target.fullId, true, false, false);
            return false;
        }

        if (polluteBlock) this._polluteBlockAt(x, y);
        if (broadcast) {
            this.broadcastBlockAt(x, y, fullId);
            this.broadcastPacketAt(x, new Packets.SPlaceBlock({x, y, fullId}));
        }
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

    tryToBreakBlockAt(entity: Entity, x: number, y: number, polluteBlock = true, broadcast = true) {
        if (!this.canBreakBlockAt(entity, x, y)) return false;

        const block = this.getBlock(x, y);

        const drops = block.getDrops();

        const cancelled = new BlockBreakEvent(entity, x, y, block, drops).emit();

        if (cancelled) return false;

        this.setFullBlock(x, y, B.AIR, true, polluteBlock, broadcast);

        for (const item of drops) {
            this.dropItem(x + Math.random() * 0.2, y + Math.random() * 0.2, item);
        }

        if (broadcast) this.broadcastPacketAt(x, new Packets.SBreakBlock({x, y, fullId: block.fullId}));
        return true;
    };

    anyEntityTouchBlock(x: number, y: number) {
        const chunkXMiddle = x >> ChunkLengthBits;
        for (let chunkX = chunkXMiddle - 1; chunkX <= chunkXMiddle + 1; chunkX++) {
            for (const e of this.chunkEntities[chunkX]) {
                if (!(e instanceof ItemEntity) && !e.canPhase && e.getBlockCollisionAt(x, y)) return true;
            }
        }
        return false;
    };

    dropItem(x: number, y: number, item: Item, vx = Math.random() - 0.5, vy = Math.random() + 0.3, delay = 0.3) {
        const entity = new ItemEntity();
        entity.x = x;
        entity.y = y;
        entity.vx = vx;
        entity.vy = vy;
        entity.delay = delay;
        entity.world = this;
        entity.item = item;
        entity.init();
        entity.broadcastSpawn();
        return entity;
    };

    getBlockCollisions(bb: BoundingBox, limit = Infinity) {
        const collisions: Collision[] = [];
        for (let x = Math.floor(bb.x); x <= Math.ceil(bb.x + bb.width); x++) {
            for (let y = Math.floor(bb.y); y <= Math.ceil(bb.y + bb.height); y++) {
                const block = this.getBlock(x, y);
                const collBB = block.getCollision(bb, x, y);
                if (collBB) {
                    collisions.push({x, y, meta: block, bb: collBB});
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

    playSound(path: string, x: number, y: number, volume = 1) {
        for (const player of this.getChunkViewers(x >> ChunkLengthBits)) {
            player.playSoundAt(path, x, y, volume);
        }
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

    broadcastPacketAt(x: number, pk: Packet, exclude: Entity[] = [], immediate = false) {
        const chunkX = x >> ChunkLengthBits;
        for (const player of this.getChunkViewers(chunkX)) {
            if (!exclude.includes(player)) player.sendPacket(pk, immediate);
        }
    };

    broadcastBlockAt(x: number, y: number, fullId = null, exclude: Entity[] = [], immediate = false) {
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
        player.sendPacket(new Packets.SChunk({
            x: chunkX, data: chunk, entities, resetEntities: true
        }), true);
    };
}