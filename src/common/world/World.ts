import BoundingBox from "@/entity/BoundingBox";
import Generator from "@/world/generators/Generator";
import FlatGenerator from "@/world/generators/FlatGenerator";
import DefaultGenerator from "@/world/generators/DefaultGenerator";
import FlowerLandGenerator from "@/world/generators/FlowerLandGenerator";
import CustomGenerator from "@/world/generators/CustomGenerator";
import {
    cgx2cx,
    checkAny,
    cx2cgi,
    cx2cgx,
    rotateMeta,
    x2cx,
    x2rx,
    xy2ci,
    zstdOptionalDecode,
    zstdOptionalEncode
} from "@/utils/Utils";
import Player from "@/entity/defaults/Player";
import Packet from "@/network/Packet";
import Entity from "@/entity/Entity";
import Server from "@/Server";
import {Packets} from "@/network/Packets";
import {z} from "zod";
import {ChunkGroupLength, WorldHeight} from "@/meta/WorldConstants";
import BlockPlaceEvent from "@/event/defaults/BlockPlaceEvent";
import BlockBreakEvent from "@/event/defaults/BlockBreakEvent";
import ItemEntity from "@/entity/defaults/ItemEntity";
import Item from "@/item/Item";
import {EntityIds} from "@/meta/Entities";
import {Containers} from "@/meta/Inventories";
import InteractBlockEvent from "@/event/defaults/InteractBlockEvent";
import Chunk from "@/world/Chunk";
import XPOrbEntity from "@/entity/defaults/XPOrbEntity";
import Tile from "@/tile/Tile";
import BlockData from "@/item/BlockData";
import Position from "@/utils/Position";
import FallingBlockEntity from "@/entity/defaults/FallingBlockEntity";
import ChunkGroupStruct from "@/structs/world/ChunkGroupStruct";
import {FullIds, ItemIds} from "@/meta/ItemIds";
import {im2f} from "@/meta/ItemInformation";
import {f2data} from "@/item/ItemFactory";

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
    generatorOptions: z.string(),
    gameRules: z.object({
        randomTickSpeed: z.number().min(0).max(10000).default(3),
        keepInventory: z.boolean().default(false)
    }),
    generationVersion: z.number().optional(),
    spawnPoint: z.object({
        x: z.number(),
        y: z.number()
    }).default({x: 0, y: -1})
});

export type WorldMetaData = z.infer<typeof ZWorldMetaData>;

export type Collision = { x: number, y: number, block: BlockData, bb: BoundingBox };

export const InteractableBlocks = [ItemIds.CRAFTING_TABLE, ItemIds.CHEST, ItemIds.FURNACE];
export const SpawnChunkDistance = 2;

// Variable meanings:
// x = World X
// y = World Y
// chunkX = A chunk's X position
// chunkX = A sub-chunk's Y position
// relX = The chunk-relative x position that goes from 0 to CHUNK_LENGTH-1
// relY = The sub-chunk-relative y position that goes from 0 to CHUNK_LENGTH-1

export default class World {
    isClient = false;
    path: string;
    chunks: Record<number, Chunk> = {};
    chunkGroups: Record<number, Chunk[]> = {};
    entities: Record<number, Entity> = {};
    tiles: Record<number, Tile> = {};
    unloaded = false;
    gameRules: WorldMetaData["gameRules"];
    spawnPoint: Position;

    constructor(
        public server: Server,
        public name: string,
        public folder: string,
        public seed: number,
        public generator: Generator,
        public chunksGenerated: Set<number>,
        public data: WorldMetaData
    ) {
        if (generator) generator.setWorld(this);
        this.path = "worlds/" + folder;
        this.gameRules = data.gameRules;
        this.spawnPoint = new Position(data.spawnPoint.x, data.spawnPoint.y, 0, this);
    };

    getSpawnPoint() {
        const spawnPoint = this.spawnPoint.copy();
        if (spawnPoint.y < 0) spawnPoint.y = this.getHighHeight(spawnPoint.x);
        return spawnPoint;
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

    // Finds the last transparent block from top
    getHighTransparentHeight(x: number) {
        return this.getChunkAt(x, true).getHighTransparentHeight(x2rx(x));
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
        return f2data(this.getFullBlockAt(x, y)) || f2data(ItemIds.AIR);
    };

    getFullBlockAt(x: number, y: number) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(y)) return ItemIds.AIR;
        return this.getChunkAt(x, false).blocks[xy2ci(x, y)];
    };

    scheduleBlockUpdateAt(x: number, y: number, ticks: number) {
        this.getChunkAt(x, false).scheduleUpdate(x2rx(x), y, ticks);
    };

    scheduleBlocksAround(x: number, y: number, ticks: number) {
        this.scheduleBlockUpdateAt(x + 1, y, ticks);
        this.scheduleBlockUpdateAt(x - 1, y, ticks);
        this.scheduleBlockUpdateAt(x, y + 1, ticks);
        this.scheduleBlockUpdateAt(x, y - 1, ticks);
    };

    updateBlockAt(x: number, y: number) {
        this.getBlock(x, y).onBlockUpdate(this, x, y);
    };

    updateBlocksAround(x: number, y: number) {
        this.updateBlockAt(x + 1, y);
        this.updateBlockAt(x - 1, y);
        this.updateBlockAt(x, y + 1);
        this.updateBlockAt(x, y - 1);
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

    private _setBlock(x: number, y: number, fullId: number, generate = true, ifEmpty = false) {
        // WARNING: This assumes x and y are integers, and y is a bounded valid height.
        const chunk = this.getChunkAt(x, generate).blocks;
        const i = xy2ci(x, y);
        const v = chunk[i];
        if (v === fullId || (ifEmpty && v !== FullIds.AIR)) return false;
        chunk[i] = fullId;
        return true;
    };

    // polluteBlock: Sets the chunk as dirty.
    // broadcast: Broadcasts the block update to all players.
    // light: Updates the necessary light levels around the block.
    // update: Applies logical block updates at and around the block.
    private _doUpdatesAt(x: number, y: number, fullId: number, polluteBlock: boolean, broadcast: boolean, light: boolean, update: boolean) {
        if (polluteBlock) this._polluteBlockAt(x, y);
        if (broadcast) this.broadcastBlockAt(x, y, fullId); // the promise doesn't matter.
        if (light) this.updateLightAt(x, y);
        if (update) {
            this.updateBlockAt(x, y);
            this.updateBlocksAround(x, y);
        }
    }

    setFullBlock(x: number, y: number, fullId: number, generate = true, polluteBlock = true, broadcast = true, light = true, update = true) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(y)) return;
        this._setBlock(x, y, fullId, generate);
        this._doUpdatesAt(x, y, fullId, polluteBlock, broadcast, light, update);
    };

    setBlock(x: number, y: number, id: number, meta = 0, generate = true, polluteBlock = true, broadcast = true, light = true, update = true, ifEmpty = false) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inWorld(y)) return;
        const fullId = im2f(id, meta);
        this._setBlock(x, y, fullId, generate, ifEmpty);
        this._doUpdatesAt(x, y, fullId, polluteBlock, broadcast, light, update);
    };

    setBlockIfEmpty(x: number, y: number, id: number, meta = 0, generate = true, polluteBlock = true, broadcast = true, light = true, update = true) {
        this.setBlock(x, y, id, meta, generate, polluteBlock, broadcast, light, update, true);
    };

    /**
     * Ensures that the chunk exists. If it exists as a file it will be loaded, otherwise it will be generated.
     */
    protected ensureChunk(chunkX: number, generate = true) {
        if (this.loadChunk(chunkX)) return;
        const chunk = this.chunks[chunkX] ??= new Chunk(this, chunkX);
        const group = this.chunkGroups[cx2cgx(chunkX)] ??= [];
        group[cx2cgi(chunkX)] = chunk;

        if (generate && this.generator && !this.chunksGenerated.has(chunkX)) {
            this.chunksGenerated.add(chunkX);
            this.generator.generate(chunkX);
            chunk.load();
            this._polluteChunk(chunkX);
        }
    };

    loadChunk(initialChunkX: number) {
        if (initialChunkX in this.chunks) return false;
        const cgx = cx2cgx(initialChunkX);
        const baseChunkX = cgx2cx(cgx);
        if (cgx in this.chunkGroups) {
            const group = this.chunkGroups[cgx];
            const i = initialChunkX - baseChunkX;
            const chunk = group[i];
            if (!chunk) return false;
            this.chunks[initialChunkX] = chunk;
            chunk.load();
            return true;
        }
        let buffer = this.getChunkGroupBuffer(cgx);
        if (!buffer) return false;
        try {
            buffer = zstdOptionalDecode(buffer);
            const groupData = ChunkGroupStruct.deserialize(buffer);
            const group = this.chunkGroups[cgx] = Array(ChunkGroupLength);
            for (let chunkX = baseChunkX; chunkX < baseChunkX + ChunkGroupLength; chunkX++) {
                const i = chunkX - baseChunkX;
                const chunkData = groupData[i];
                if (chunkData === null) continue;
                const chunk = this.chunks[chunkX] = group[i] = new Chunk(this, chunkX);
                chunk.blocks.set(chunkData.blocks);
                chunk.recalculateLights();

                for (const entity of chunkData.entities) {
                    (<Position>entity).world = this;
                    chunk.entities.add(entity);
                }
                for (const tile of chunkData.tiles) {
                    (<Position>tile).world = this;
                    chunk.tiles.add(tile);
                }

                Object.assign(chunk.updateSchedules, chunkData.updateSchedules);

                this.chunksGenerated.add(chunkX);

                if (chunkX === initialChunkX) {
                    this.chunks[initialChunkX] = chunk;
                    chunk.load();
                }
            }
        } catch (e) {
            printer.error(`Chunk group at ${initialChunkX} is corrupted (Chunk group ${cgx}). Crashing for safety.`, e);

            throw e;
            //this.removeChunkBuffer(chunkX);
            //return false;
        }
        return true;
    };

    serverUpdate(dt: number): void {
        for (const x in this.chunks) {
            this.chunks[x].serverUpdate(dt);
        }
    };

    serverTick() {
        for (const x in this.chunks) {
            this.chunks[x].serverTick();
        }
    };

    saveChunkGroup(chunkGroupX: number) {
        const baseChunkX = cgx2cx(chunkGroupX);
        const list = [];
        let hasDirty = false;
        for (let chunkX = baseChunkX; chunkX < baseChunkX + ChunkGroupLength; chunkX++) {
            const chunk = this.chunks[chunkX];
            if (!chunk) {
                list.push(null);
                continue;
            }

            const generated = this.chunksGenerated.has(chunkX);

            if (generated) {
                list.push({
                    blocks: chunk.blocks,
                    entities: Array.from(chunk.entities).filter(i => !(i instanceof Player)),
                    tiles: Array.from(chunk.tiles),
                    updateSchedules: chunk.updateSchedules
                });
            } else list.push(null)

            if (chunk.dirty && generated) hasDirty = true;
            chunk.dirty = false;
        }

        if (!hasDirty) return;

        const buffer = ChunkGroupStruct.serialize(list);

        this.setChunkGroupBuffer(chunkGroupX, zstdOptionalEncode(buffer));
    };

    save() {
        const cgxList = [];
        for (const x in this.chunks) {
            const chunk = this.chunks[x];
            const cgx = cx2cgx(+x);
            if (chunk.dirty && !cgxList.includes(cgx)) cgxList.push(cgx);
        }

        for (const cgx of cgxList) this.saveChunkGroup(cgx);

        const path = "worlds/" + this.folder + "/world.json";

        this.server.writeFile(path, JSON.stringify(this.data, null, 2));
    };

    unload() {
        if (this.unloaded) return;

        if (this === this.server.defaultWorld) return this.server.close();

        this.unloaded = true;

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
        const block = f2data(fullId);
        if (
            entity.despawned
            || !this.inWorld(y)
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

        this._setBlock(x, y, fullId, true);
        const touchingBlock = this.anyEntityTouchBlock(x, y);
        this._setBlock(x, y, target.fullId, true);

        return !touchingBlock;
    };

    tryToPlaceBlockAt(entity: Entity, x: number, y: number, id: number, meta: number, rotation = 0, polluteBlock = true, broadcast = true, light = true, update = true) {
        x = Math.round(x);
        y = Math.round(y);
        meta = rotateMeta(id, meta, rotation);
        if (entity.despawned || !this.canPlaceBlockAt(entity, x, y, id, meta, rotation)) return false;

        const fullId = im2f(id, meta);
        const block = f2data(fullId);
        const target = this.getBlock(x, y);
        this._setBlock(x, y, fullId, true);

        const cancelled = new BlockPlaceEvent(entity, x, y, block).callGetCancel();

        if (cancelled) {
            this._setBlock(x, y, target.fullId, true);
            return false;
        }

        this._doUpdatesAt(x, y, fullId, polluteBlock, broadcast, light, update);

        if (broadcast) this.broadcastPacketAt(x, new Packets.SPlaceBlock({x, y, fullId}));

        return true;
    };

    canBreakBlockAt(entity: Entity, x: number, y: number) {
        x = Math.round(x);
        y = Math.round(y);
        const target = this.getBlock(x, y);
        return !entity.despawned
            && this.inWorld(y)
            && entity.distance(x, y) <= entity.getBlockReach()
            && this.getBlockDepth(x, y) <= 1
            && target.getBreakTime(entity instanceof Player ? entity.handItem : null) !== -1
            && !target.isLiquid;
    };

    tryToBreakBlockAt(entity: Entity, x: number, y: number, polluteBlock = true, broadcast = true, light = true, damage = true) {
        if (entity.despawned || !this.canBreakBlockAt(entity, x, y)) return false;

        const block = this.getBlock(x, y);

        const handItem = entity.handItem;
        const drops = block.getDrops(handItem);
        const xpDrops = block.getXPDrops(handItem);

        const cancelled = new BlockBreakEvent(entity, x, y, block, drops, xpDrops).callGetCancel();

        if (cancelled) return false;

        this.setFullBlock(x, y, FullIds.AIR, true, polluteBlock, broadcast);

        if (!(entity instanceof Player) || !entity.infiniteResource) {
            for (const item of drops) {
                this.dropItem(x + Math.random() * 0.2, y + Math.random() * 0.2, item);
            }

            if (xpDrops > 0) this.dropXP(x + Math.random() * 0.2, y + Math.random() * 0.2, xpDrops);
        }

        if (broadcast) this.broadcastPacketAt(x, new Packets.SBreakBlock({x, y, fullId: block.fullId}));

        if (light) this.updateLightAt(x, y);

        if (damage && entity instanceof Player && block.getBreakTime(entity.handItem) > 0) {
            entity.hotbarInventory.damageItemAt(entity.handIndex, 1);
        }

        return true;
    };

    canInteractBlockAt(entity: Entity, x: number, y: number) {
        x = Math.round(x);
        y = Math.round(y);
        const target = this.getBlock(x, y);
        return !entity.despawned
            && this.inWorld(y)
            && entity.distance(x, y) <= entity.getBlockReach()
            && this.getBlockDepth(x, y) <= 1
            && InteractableBlocks.includes(target.id);
    };

    tryToInteractBlockAt(player: Player, x: number, y: number) {
        if (player.despawned || !this.canInteractBlockAt(player, x, y)) return;

        const block = this.getBlock(x, y);

        if (new InteractBlockEvent(player, x, y, block).callGetCancel()) return;

        const containerId = {
            [ItemIds.CRAFTING_TABLE]: Containers.CraftingTable,
            [ItemIds.FURNACE]: Containers.Furnace,
            [ItemIds.CHEST]: Containers.Chest
        }[block.id];

        if (!containerId) return;

        player.containerId = containerId;
        player.containerX = x;
        player.containerY = y;
        player.network?.sendContainer();
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

    createEntity<T extends Entity>(id: EntityIds, x: number, y: number) {
        const entity = new (this.server.registeredEntities[id])();
        entity.x = x;
        entity.y = y;
        (<Position>entity).world = this;
        return <T>entity;
    };

    summonEntity<T extends Entity>(id: EntityIds, x: number, y: number, nbt: Record<string, unknown> = {}) {
        const entity = this.createEntity<T>(id, x, y);

        if (nbt) {
            if (!checkAny(nbt, entity)) return null;
            try {
                Object.assign(entity, entity.saveStruct.adapt(nbt));
            } catch {
                return null;
            }
        }

        return entity.init() ? entity : null;
    };

    dropItem(x: number, y: number, item: Item, vx = Math.random() - 0.5, vy = Math.random() + 0.3, delay = 0.3) {
        const entity = this.createEntity<ItemEntity>(EntityIds.ITEM, x, y);
        entity.vx = vx;
        entity.vy = vy;
        entity.delay = delay;
        entity.item = item;
        entity.init();
        return entity;
    };

    dropXP(x: number, y: number, amount: number, vx = Math.random() - 0.5, vy = Math.random() + 0.3, delay = 0.3) {
        const entity = this.createEntity<XPOrbEntity>(EntityIds.XP_ORB, x, y);
        entity.vx = vx;
        entity.vy = vy;
        entity.delay = delay;
        entity.amount = amount;
        entity.init();
        return entity;
    };

    dropFallingBlock(x: number, y: number, block: BlockData) {
        const entity = this.createEntity<FallingBlockEntity>(EntityIds.FALLING_BLOCK, x, y - 0.5);
        entity.blockFullId = block.fullId;
        entity.init();
        return entity;
    };

    getBlockCollisions(bb: BoundingBox, limit = Infinity) {
        const collisions: Collision[] = [];
        for (let x = Math.floor(bb.x); x <= Math.ceil(bb.x + bb.width); x++) {
            for (let y = Math.floor(bb.y); y <= Math.ceil(bb.y + bb.height); y++) {
                const block = this.getBlock(x, y);
                const collBB = block.getCollision(bb, x, y);
                if (collBB) {
                    collisions.push({x, y, block, bb: collBB});
                    if (collisions.length >= limit) return collisions;
                }
            }
        }
        return collisions;
    };

    __isPlaceableAt(x: number, y: number) {
        const block = this.getBlock(x, y);
        return block.id !== ItemIds.AIR && !block.isLiquid;
    };

    hasSurroundingBlock(x: number, y: number) {
        return this.__isPlaceableAt(x - 1, y) ||
            this.__isPlaceableAt(x + 1, y) ||
            this.__isPlaceableAt(x, y - 1) ||
            this.__isPlaceableAt(x, y + 1);
    };

    getBlockDepth(x: number, y: number, careOpaque = false, careLava = false) {
        const target = this.getBlock(x, y);

        if (careOpaque) {
            if (!this.getBlock(x, y).isOpaque) return 0;
        } else if (target.id === ItemIds.AIR) return 0;

        for (const [dx, dy] of Ring1) {
            const block = this.getBlock(x + dx, y + dy);
            if (!block.isOpaque && (!careLava || block.id !== ItemIds.LAVA || block.meta > 1)) return 1;
        }

        for (const [dx, dy] of Ring2) {
            const block = this.getBlock(x + dx, y + dy);
            if (!block.isOpaque && (!careLava || block.id !== ItemIds.LAVA || block.meta > 1)) return 2;
        }

        for (const [dx, dy] of Ring3) {
            const block = this.getBlock(x + dx, y + dy);
            if (!block.isOpaque && (!careLava || block.id !== ItemIds.LAVA || block.meta > 1)) return 3;
        }

        return 4;
    };

    isBlockOpaqueWithLight(x: number, y: number) {
        return this.getBlock(x, y).isOpaque || this.getLightLevelAt(x, y) === 0;
    };

    getShadowOpacity(x: number, y: number) {
        return [0, 0, 1, 1, 1][this.getBlockDepth(x, y, true, true)];
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

    getChunkGroupBuffer(chunkGroupX: number): Buffer | null {
        const path = this.path + "/chunks/" + chunkGroupX + ".dat";
        if (!this.server.fileExists(path)) return null;
        return this.server.readFile(path);
    };

    setChunkGroupBuffer(chunkGroupX: number, buffer: Buffer) {
        this.server.createDirectory(this.path + "/chunks");
        this.server.writeFile(this.path + "/chunks/" + chunkGroupX + ".dat", buffer);
    };

    removeChunkGroupBuffer(chunkGroupX: number) {
        this.server.deleteFile(this.path + "/chunks/" + chunkGroupX + ".dat");
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