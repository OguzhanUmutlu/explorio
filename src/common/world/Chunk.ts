import {ChunkBlockAmount, ChunkGroupLength, ChunkLength, WorldHeight} from "@/meta/WorldConstants";

import {SpawnChunkDistance, World} from "@/world/World";
import {Player} from "@/entity/defaults/Player";
import {cgx2cx, cx2cgx, cx2x, i2rx, i2ry, randInt, rxy2ci} from "@/utils/Utils";
import {Tile} from "@/tile/Tile";
import {BlockData} from "@/item/BlockData";
import {Entity} from "@/entity/Entity";
import {f2data} from "@/item/ItemFactory";
import {FullIds} from "@/meta/ItemIds";

export enum ChunkState {
    Empty = 0,       // readonly empty chunk         (generate() -> Loaded)
    LoadingFile = 1, // readonly empty chunk         (read end   -> Loaded)
    Unloaded = 2,    // filled chunk                 (load()     -> Loaded)
    Loaded = 3       // filled chunk, ticks, saves   (unload()   -> Ready)
}

const emptyBlocks = new Proxy({}, {
    get: () => FullIds.AIR,
    set: () => true
}) as Uint16Array;

export class Chunk {
    blocks: Uint16Array = emptyBlocks;
    entities = new Set<Entity>();
    tiles = new Set<Tile>();
    referees = 0;
    dirty = false;
    dirtyBlocks = false;

    lightLevels: Uint8Array = new Uint8Array(ChunkBlockAmount);
    unloadTimer = 30;

    state = ChunkState.Empty;

    updateSchedules: Record<number, number> = {};
    private __biome: number;
    readonly groupX: number;

    constructor(public world: World, public readonly x: number) {
        this.groupX = cx2cgx(x);
    };

    get isFilled() {
        return this.state === ChunkState.Loaded || this.state === ChunkState.Unloaded;
    };

    get isSpawnChunk() {
        return this.x <= SpawnChunkDistance && this.x >= -SpawnChunkDistance;
    };

    dereference() {
        if (--this.referees <= 0) this.unloadTimer = 10;
    };

    reference() {
        if (!this.isFilled) return;
        this.referees++;
    };

    pollute(blocks = false) {
        if (blocks) this.dirtyBlocks = true;
        this.dirty = true;
    };

    scheduleUpdate(relX: number, y: number, ticks: number) {
        this.pollute();
        this.updateSchedules[rxy2ci(relX, y)] = ticks;
    };

    updateBlock(relX: number, y: number) {
        this.getBlock(relX, y).onBlockUpdate(this.world, cx2x(this.x, relX), y);
    };

    // Finds the first air block from bottom
    getLowHeight(relX: number) {
        let i = rxy2ci(relX, 0);
        while (i < ChunkBlockAmount && !f2data(this.blocks[i]).canBePhased) i += ChunkLength;
        return (i - relX) / ChunkLength;
    };

    // Finds the last air block from top
    getHighHeight(relX: number) {
        let i = rxy2ci(relX, WorldHeight - 1);
        while (i >= 0 && f2data(this.blocks[i]).canBePhased && i > 0) i -= ChunkLength;
        return (i - relX) / ChunkLength + 1;
    };

    // Finds the last transparent block from top
    getHighTransparentHeight(relX: number) {
        let i = rxy2ci(relX, WorldHeight - 1);
        while (i >= 0 && !f2data(this.blocks[i]).isOpaque && i > 0) i -= ChunkLength;
        return (i - relX) / ChunkLength + 1;
    };

    get biome() {
        return this.__biome ??= this.world.generator.getBiomeAtChunk(this.x);
    };

    __setBiome(biome: number) {
        // for client-side
        this.__biome = biome;
    };

    serverUpdate(dt: number) {
        if (this.referees <= 0 && !this.isSpawnChunk && (this.unloadTimer -= dt) <= 0) return void this.unload();

        for (const e of this.entities) {
            if (e instanceof Player) continue;
            e.serverUpdate(dt);
        }
    };

    serverTick() {
        for (let i = 0; i < this.world.gameRules.randomTickSpeed; i++) {
            const relX = randInt(0, ChunkLength - 1);
            const y = randInt(0, WorldHeight - 1);
            const block = this.getBlock(relX, y);
            if (block.ticksRandomly) block.randomTick(this.world, cx2x(this.x, relX), y);
        }

        const updates = Object.keys(this.updateSchedules);

        if (updates.length > 0) {
            for (let i = 0; i < updates.length; i++) {
                const u = +updates[i];
                if (--this.updateSchedules[u] <= 0) {
                    delete this.updateSchedules[u];
                    this.pollute();
                    const relX = i2rx(u);
                    const y = i2ry(u);
                    this.getBlock(relX, y).onScheduledBlockUpdate(this.world, cx2x(this.x, relX), y);
                }
            }
        }
    };

    sendTo(player: Player, immediate = true) {
        if (!this.isFilled) return;
        player.network?.sendChunks([this], immediate);
    };

    ensure(generate = false) {
        if (this.state === ChunkState.Empty) {
            this.state = ChunkState.LoadingFile;
            if (this.world.unloadedChunkGroups.has(this.groupX)) {
                this.world.__loadChunkGroup(this.groupX).then(r => r);
                return;
            } else if (this.world.loadingChunkGroups.has(this.groupX)) return;
            this.state = ChunkState.Empty;
        }

        if (generate) {
            this.generate();
        }
    };

    load() {
        if (this.state !== ChunkState.Unloaded) return;
        this.state = ChunkState.Loaded;
        for (const entity of this.entities) entity.init();
        for (const tile of this.tiles) tile.init();
        for (let i = 0; i < ChunkBlockAmount; i++) {
            const blockData = f2data(this.blocks[i]);
            blockData.onBlockUpdate(this.world, cx2x(this.x, i2rx(i)), i2ry(i));
        }
        this.pollute(true);
    };

    generate() {
        if (this.state !== ChunkState.Empty || this.world.unloadedChunkGroups.has(this.groupX)) return;
        this.state = ChunkState.Unloaded;
        this.blocks = new Uint16Array(ChunkBlockAmount);
        this.world.generator.generate(this.x);
        this.load();
    };

    async unload() {
        if (this.state !== ChunkState.Loaded) return;
        this.state = ChunkState.Unloaded;
        for (const player of this.world.getPlayers()) {
            player.viewingChunks.delete(this.x);
        }
        this.referees = 0;

        await this.world.saveChunkGroup(this.groupX);

        for (const entity of this.entities) {
            if (entity instanceof Player) {
                entity.kick("The chunk you were in was unloaded. Please contact the server owner.");
            }

            entity.despawn(false);
        }

        delete this.world.chunks[this.x];

        const startChunkX = cgx2cx(this.groupX);
        for (let chunkX = startChunkX; chunkX < startChunkX + ChunkGroupLength; chunkX++) {
            if (chunkX in this.world.chunks) return;
        }

        // all chunks in this chunk group are unloaded, so unload the chunk group
        delete this.world.chunkGroups[this.groupX];
    };

    getFullBlock(relX: number, y: number): number {
        if (!this.isFilled) return FullIds.AIR;
        if (relX < 0 || relX >= ChunkLength) return this.world.getFullBlockAt(cx2x(this.x, relX), y);
        if (y < 0 || y >= WorldHeight) return FullIds.AIR;
        return this.blocks[rxy2ci(relX, y)];
    };

    getBlock(relX: number, y: number): BlockData {
        return f2data(this.getFullBlock(relX, y));
    };

    getLight(relX: number, y: number) {
        return this.lightLevels[rxy2ci(relX, y)];
    };

    setLight(relX: number, y: number, light: number, update = true) {
        const i = rxy2ci(relX, y);

        if (this.lightLevels[i] === light) return;

        this.lightLevels[i] = light;

        if (update) this.world.onUpdateLight(cx2x(this.x) + relX, y);
    };

    updateLight(_relX: number, _y: number) {
        /*if (y < 0 || y >= WorldHeight) return;
        this.setLight(relX, y, 0, false);
        this.applyLight(relX + 1, y, this.getLight(relX + 1, y), true, true);
        this.applyLight(relX - 1, y, this.getLight(relX - 1, y), true, true);
        this.applyLight(relX, y + 1, this.getLight(relX, y + 1), true, true);
        this.applyLight(relX, y - 1, this.getLight(relX, y - 1), true, true);*/
    };

    /*applyLight(relX: number, y: number, light: number, force = false, update = false) {
        if (relX >= ChunkLength) return this.world.getChunk(this.x + 1, false).applyLight(relX - ChunkLength, y, light, force, update);
        if (relX < 0) return this.world.getChunk(this.x - 1, false).applyLight(relX + ChunkLength, y, light, force, update);
        if (y < 0 || y >= WorldHeight) return;

        const i = rxy2ci(relX, y);

        const block = BM[this.blocks[i]];

        if (block.isOpaque) {
            light -= 4;
        }

        const already = this.lightLevels[i];

        if (already >= light || force) return;

        this.setLight(relX, y, light, update && !force);

        if (light <= 1) return;

        this.applyLight(relX + 1, y, light - 1, false, update);
        this.applyLight(relX - 1, y, light - 1, false, update);
        this.applyLight(relX, y + 1, light - 1, false, update);
        this.applyLight(relX, y - 1, light - 1, false, update);
    };

    fixLightsFromLeftRight(dx: 1 | -1) {
        const world = this.world;
        const x0 = dx === 1 ? ChunkLength - 1 : 0;
        const x1 = dx === -1 ? ChunkLength - 1 : 0;

        if (world.chunksGenerated.has(this.x + dx)) {
            // for example: left chunk is generated, so we have to update all lights at the most-right of the left chunk
            const leftChunk = world.getChunk(this.x + dx, false);
            for (let y = 0; y < WorldHeight; y++) {
                const blockCurrent = this.getBlock(x0, y);
                const light = leftChunk.getLight(x1, y) - (blockCurrent.isOpaque ? 4 : 1);
                this.applyLight(x0, y, light);
            }
        }
    };*/

    recalculateLights() {
        // todo: figure this out
        /*this.lightLevels.fill(0);

        for (let relX = 0; relX < ChunkLength; relX++) {
            const hy = this.getHighTransparentHeight(relX);
            this.applyLight(relX, hy, 15);
            for (let y = hy + 1; y < WorldHeight; y++) {
                this.applyLight(relX, y, 15);
            }
        }

        this.fixLightsFromLeftRight(-1);
        this.fixLightsFromLeftRight(1);*/
    };
}