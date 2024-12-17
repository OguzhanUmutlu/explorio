import {im2f, ItemMetadata} from "@/meta/Items";
import {B, BM, I} from "@/meta/ItemIds";
import BoundingBox from "@/entity/BoundingBox";
import Generator from "@/world/generators/Generator";
import FlatGenerator from "@/world/generators/FlatGenerator";
import DefaultGenerator from "@/world/generators/DefaultGenerator";
import FlowerLandGenerator from "@/world/generators/FlowerLandGenerator";
import CustomGenerator from "@/world/generators/CustomGenerator";
import {rotateMeta, x2cx, x2rx, xy2ci, zstdOptionalDecode} from "@/utils/Utils";
import Player from "@/entity/defaults/Player";
import Packet from "@/network/Packet";
import Entity from "@/entity/Entity";
import Server from "@/Server";
import {Packets} from "@/network/Packets";
import ChunkStruct from "@/structs/world/ChunkStruct";
import {z} from "zod";
import {WorldHeight} from "@/meta/WorldConstants";
import BlockPlaceEvent from "@/event/defaults/BlockPlaceEvent";
import BlockBreakEvent from "@/event/defaults/BlockBreakEvent";
import ItemEntity from "@/entity/defaults/ItemEntity";
import Item from "@/item/Item";
import {Entities, EntityClasses} from "@/meta/Entities";
import {Containers} from "@/meta/Inventories";
import InteractBlockEvent from "@/event/defaults/InteractBlockEvent";
import Chunk from "@/world/Chunk";
import {Version, Versions, VersionString} from "@/Versions";

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

export const InteractableBlocks = [I.CRAFTING_TABLE];
export const SpawnChunkDistance = 2;

// Variable meanings:
// x = World X
// y = World Y
// chunkX = A chunk's X position
// chunkX = A sub-chunk's Y position
// relX = The chunk-relative x position that goes from 0 to CHUNK_LENGTH-1
// relY = The sub-chunk-relative y position that goes from 0 to CHUNK_LENGTH-1

export default class World {
    path: string;
    chunks: Record<number, Chunk> = {};
    entities: Record<number, Entity> = {};

    constructor(
        public server: Server,
        public name: string,
        public folder: string,
        public seed: number,
        public generator: Generator,
        public chunksGenerated: Set<number>
    ) {
        if (generator) generator.setWorld(this);
        this.path = "worlds/" + folder;
    };

    ensureSpawnChunks() {
        for (let x = -SpawnChunkDistance; x <= SpawnChunkDistance; x++) {
            this.ensureChunk(x);
        }
    };

    getPlayers() {
        return <Player[]>Object.values(this.server.players).filter(p => p.world === this);
    };

    // Finds the first air block from bottom
    getLowHeight(x: number) {
        return this.getChunkAt(x, true).getLowHeight(x2rx(x));
    };

    // Finds the last air block from top
    getHighHeight(x: number) {
        return this.getChunkAt(x, true).getHighHeight(x2rx(x));
    };

    getLightLevelAt(x: number, y: number) {
        x = Math.round(x);
        y = Math.round(y);
        return this.getChunkAt(x, false).lightLevels[xy2ci(x, y)];
    };

    getChunkEntitiesAt(x: number) {
        return this.getChunkAt(x, false).entities;
    };

    getChunkEntities(chunkX: number) {
        return this.getChunk(chunkX, false).entities;
    };

    getChunkAt(x: number, generate: boolean) {
        return this.getChunk(x2cx(x), generate);
    };

    getChunk(chunkX: number, generate: boolean) {
        this.ensureChunk(chunkX, generate);
        return this.chunks[chunkX];
    };

    getBlock(x: number, y: number) {
        return BM[this.getFullBlockAt(x, y)] || BM[0];
    };

    getFullBlockAt(x: number, y: number) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(y)) return 0;
        return this.getChunkAt(x, false).blocks[xy2ci(x, y)];
    };

    inWorld(y: number) {
        return y < WorldHeight && y >= 0;
    };

    recalculateLights(chunkX: number, generate = false) {
        this.getChunk(chunkX, generate).recalculateLights();
    };

    updateLightAt(x: number, y: number, generate = false) {
        this.getChunkAt(x, generate).updateLight(x2rx(x), y);
    };

    _setBlock(x: number, y: number, fullId: number, generate = true, polluteBlock = true, broadcast = true, light = true) {
        // WARNING: This assumes x and y are integers, and y is a bounded valid height.
        const chunk = this.getChunkAt(x, generate).blocks;
        const i = xy2ci(x, y);
        if (chunk[i] === fullId) return false;
        chunk[i] = fullId;
        if (polluteBlock) this._polluteBlockAt(x, y);
        if (broadcast) this.broadcastBlockAt(x, y, fullId); // the promise doesn't matter.
        if (light) this.updateLightAt(x, y);
        return true;
    };

    setFullBlock(x: number, y: number, fullId: number, generate = true, polluteBlock = true, broadcast = true, light = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(y)) return;
        this._setBlock(x, y, fullId, generate, polluteBlock, broadcast, light);
    };

    setBlock(x: number, y: number, id: number, meta: number, generate = true, polluteBlock = true, broadcast = true, light = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(y)) return;
        this._setBlock(x, y, im2f(id, meta), generate, polluteBlock, broadcast, light);
    };


    /**
     * Ensures that the chunk exists. If it exists as a file it will be loaded, otherwise it will be generated.
     */
    protected ensureChunk(chunkX: number, generate = true) {
        if (this.loadChunk(chunkX)) return;
        this.chunks[chunkX] ??= new Chunk(this, chunkX);

        if (generate && this.generator && !this.chunksGenerated.has(chunkX)) {
            this.chunksGenerated.add(chunkX);
            this.generator.generate(chunkX);
            this._polluteChunk(chunkX);
        }
    };

    loadChunk(chunkX: number) {
        if (chunkX in this.chunks) return false;
        let buffer = this.getChunkBuffer(chunkX);
        if (!buffer) return false;
        try {
            const version = buffer.readUint16LE(0);
            if (version !== Version) throw version;

            buffer = buffer.slice(2);

            buffer = zstdOptionalDecode(buffer);
            const chunkData = ChunkStruct.deserialize(buffer);
            const chunk = this.chunks[chunkX] = new Chunk(this, chunkX);
            chunk.blocks.set(chunkData.blocks);
            chunk.recalculateLights();

            for (const entity of chunkData.entities) {
                entity.world = this;
                entity.init();
            }

            this.chunksGenerated.add(chunkX);
            for (const viewer of this.getChunkViewers(chunkX)) {
                this.sendChunk(viewer, chunkX);
            }
        } catch (e) {
            if (typeof e === "number") {
                printer.error(`Chunk ${chunkX} was generated by ${e > Version ? "a newer" : "an older"} version of `
                    + `the server(${e > Version ? "" : `Version: ${Versions[e]}`}Version ID: ${e}).\n`
                    + `You can either delete the chunk for it to regenerate or you can replace it with another chunk that `
                    + `was generated by the same version of the server(Version: ${VersionString}, Version ID: ${Version}).`);
                this.server.close();
                throw "";
            }
            printer.warn(`Chunk ${chunkX} is corrupted, regenerating...`, e);
            this.chunksGenerated.delete(chunkX);
            this.removeChunkBuffer(chunkX);
            return false;
        }
        return true;
    };

    serverUpdate(dt: number): void {
        for (const x in this.chunks) {
            this.chunks[x].serverUpdate(dt);
        }
    };

    save() {
        for (const x in this.chunks) {
            const chunk = this.chunks[x];
            if (chunk.dirty) chunk.save();
        }
    };

    unload() {
        for (const x in this.chunks) {
            this.chunks[x].unload();
        }
    };

    _polluteChunk(chunkX: number) {
        this.getChunk(chunkX, true).pollute();
    };

    _polluteBlockAt(x: number, _y: number) {
        this._polluteChunk(x2cx(x));
    };

    onUpdateLight(_x: number, _y: number) {
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

        this._setBlock(x, y, fullId, true, false, false, false);
        const touchingBlock = this.anyEntityTouchBlock(x, y);
        this._setBlock(x, y, target.fullId, true, false, false, false);

        return !touchingBlock;
    };

    tryToPlaceBlockAt(entity: Entity, x: number, y: number, id: number, meta: number, rotation = 0, polluteBlock = true, broadcast = true, light = true) {
        x = Math.round(x);
        y = Math.round(y);
        meta = rotateMeta(id, meta, rotation);
        if (!this.canPlaceBlockAt(entity, x, y, id, meta, rotation)) return false;

        const fullId = im2f(id, meta);
        const block = BM[fullId];
        const target = this.getBlock(x, y);
        this._setBlock(x, y, fullId, true, false, false, false);

        const cancelled = new BlockPlaceEvent(entity, x, y, block).callGetCancel();

        if (cancelled) {
            this._setBlock(x, y, target.fullId, true, false, false, false);
            return false;
        }

        if (polluteBlock) this._polluteBlockAt(x, y);
        if (broadcast) {
            this.broadcastBlockAt(x, y, fullId);
            this.broadcastPacketAt(x, new Packets.SPlaceBlock({x, y, fullId}));
        }

        if (light) this.updateLightAt(x, y);
        return true;
    };

    canBreakBlockAt(entity: Entity, x: number, y: number) {
        x = Math.round(x);
        y = Math.round(y);
        const target = this.getBlock(x, y);
        return this.inWorld(y)
            && entity.distance(x, y) <= entity.getBlockReach()
            && this.getBlockDepth(x, y) <= 1
            && target.getHardness() !== -1
            && !target.liquid;
    };

    tryToBreakBlockAt(entity: Entity, x: number, y: number, polluteBlock = true, broadcast = true, light = true) {
        if (!this.canBreakBlockAt(entity, x, y)) return false;

        const block = this.getBlock(x, y);

        const drops = block.getDrops();

        const cancelled = new BlockBreakEvent(entity, x, y, block, drops).callGetCancel();

        if (cancelled) return false;

        this.setFullBlock(x, y, B.AIR, true, polluteBlock, broadcast);

        if (!(entity instanceof Player) || !entity.infiniteResource) for (const item of drops) {
            this.dropItem(x + Math.random() * 0.2, y + Math.random() * 0.2, item);
        }

        if (broadcast) this.broadcastPacketAt(x, new Packets.SBreakBlock({x, y, fullId: block.fullId}));

        if (light) this.updateLightAt(x, y);
        return true;
    };

    canInteractBlockAt(entity: Entity, x: number, y: number) {
        x = Math.round(x);
        y = Math.round(y);
        const target = this.getBlock(x, y);
        return this.inWorld(y)
            && entity.distance(x, y) <= entity.getBlockReach()
            && this.getBlockDepth(x, y) <= 1
            && InteractableBlocks.includes(target.id);
    };

    tryAndInteractBlockAt(player: Player, x: number, y: number) {
        if (!this.canInteractBlockAt(player, x, y)) return;

        const block = this.getBlock(x, y);

        if (new InteractBlockEvent(player, x, y, block).callGetCancel()) return;

        switch (block.id) {
            case I.CRAFTING_TABLE:
                player.containerId = Containers.CraftingTable;
                player.containerX = x;
                player.containerY = y;
                player.network?.sendContainer();
                break;
        }
    };

    anyEntityTouchBlock(x: number, y: number) {
        const chunkXMiddle = x2cx(x);
        for (let chunkX = chunkXMiddle - 1; chunkX <= chunkXMiddle + 1; chunkX++) {
            for (const e of this.getChunkEntities(chunkX)) {
                if (!(e instanceof ItemEntity) && !e.canPhase && e.getBlockCollisionAt(x, y)) return true;
            }
        }
        return false;
    };

    createEntity<T extends Entity>(id: Entities, x: number, y: number) {
        const entity = new (EntityClasses[id])();
        entity.x = x;
        entity.y = y;
        entity.world = this;
        return <T>entity;
    };

    summonEntity<T extends Entity>(id: Entities, x: number, y: number) {
        const entity = this.createEntity<T>(id, x, y);
        entity.init();
        entity.broadcastSpawn();
        return entity;
    };

    dropItem(x: number, y: number, item: Item, vx = Math.random() - 0.5, vy = Math.random() + 0.3, delay = 0.3) {
        const entity = this.createEntity<ItemEntity>(Entities.ITEM, x, y);
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

    __canPlaceBlockAroundSimple(x: number, y: number) {
        const block = this.getBlock(x, y);
        return block.id !== I.AIR && !block.liquid;
    };

    hasSurroundingBlock(x: number, y: number) {
        return this.__canPlaceBlockAroundSimple(x - 1, y) ||
            this.__canPlaceBlockAroundSimple(x + 1, y) ||
            this.__canPlaceBlockAroundSimple(x, y - 1) ||
            this.__canPlaceBlockAroundSimple(x, y + 1);
    };

    getBlockDepth(x: number, y: number, careOpaque = false) {
        const target = this.getBlock(x, y);

        if (careOpaque) {
            if (!this.getBlock(x, y).isOpaque) return 0;
        } else if (target.id === I.AIR) return 0;

        for (const [dx, dy] of Ring1) {
            if (!this.getBlock(x + dx, y + dy).isOpaque) return 1;
        }

        for (const [dx, dy] of Ring2) {
            if (!this.getBlock(x + dx, y + dy).isOpaque) return 2;
        }

        for (const [dx, dy] of Ring3) {
            if (!this.getBlock(x + dx, y + dy).isOpaque) return 3;
        }

        return 4;
    };

    isBlockOpaqueWithLight(x: number, y: number) {
        return this.getBlock(x, y).isOpaque || this.getLightLevelAt(x, y) === 0;
    };

    getShadowOpacity(x: number, y: number) {
        return [0, 0, 0.25, 0.5, 1][this.getBlockDepth(x, y)];
        /*const normalDepth = this.getBlockDepth(x, y);
        const light = this.getLightLevelAt(x, y);

        if (normalDepth === 4) return 1;
        if (normalDepth >= 2 && light === 0) return 1;
        if (normalDepth === 1 && light > 7) return Math.max(0, (10 - light) / 15);

        return (15 - light) / 17;*/
    };

    playSound(path: string, x: number, y: number, volume = 1) {
        for (const player of this.getChunkViewers(x2cx(x))) {
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
            const entities = this.getChunkEntities(chunkX);

            for (const entity of entities) {
                if (entity instanceof Player) players.push(entity);
            }
        }

        return players;
    };

    broadcastPacketAt(x: number, pk: Packet, exclude: Entity[] = [], immediate = false) {
        const chunkX = x2cx(x);
        for (const player of this.getChunkViewers(chunkX)) {
            if (!exclude.includes(player)) {
                player.sendPacket(pk, immediate);
            }
        }
    };

    broadcastBlockAt(x: number, y: number, fullId = null, exclude: Entity[] = [], immediate = false) {
        if (this.server.isClientSide()) return;
        const chunkX = x2cx(x);
        fullId ??= this.getFullBlockAt(x, y);
        for (const player of this.getChunkViewers(chunkX)) {
            if (!exclude.includes(player)) player.network.sendBlock(x, y, fullId, immediate);
        }
    };

    sendChunk(player: Player, chunkX: number) {
        const chunk = this.getChunk(chunkX, true);
        player.network?.sendChunk(chunkX, chunk.blocks, Array.from(chunk.entities), true);
    };
}