import {ChunkBlockAmount, ChunkLength, WorldHeight} from "@/meta/WorldConstants";
import Entity from "@/entity/Entity";
import World, {SpawnChunkDistance} from "@/world/World";
import ChunkStruct from "@/structs/world/ChunkStruct";
import Player from "@/entity/defaults/Player";
import {cx2x, rxy2ci, zstdOptionalEncode} from "@/utils/Utils";
import {BM} from "@/meta/ItemIds";
import {ItemMetadata} from "@/meta/Items";
import {WorldGenerationVersion} from "@/Versions";

export default class Chunk {
    blocks: Uint16Array = new Uint16Array(ChunkBlockAmount);
    entities = new Set<Entity>();
    referees = 0;
    dirty = false;
    dirtyTime = 0;
    playerCleanTimes: Record<string, number> = {};
    lightLevels: Uint8Array = new Uint8Array(ChunkBlockAmount);
    unloadTimer = 30;
    unloaded = false;

    constructor(public world: World, public x: number) {
    };

    get isSpawnChunk() {
        return this.x <= SpawnChunkDistance && this.x >= -SpawnChunkDistance;
    };

    dereference() {
        if (--this.referees <= 0) this.unloadTimer = 10;
    };

    reference() {
        this.referees++;
    };

    pollute() {
        this.dirty = true;
        const now = this.dirtyTime = Date.now();
        for (const k in this.playerCleanTimes) this.playerCleanTimes[k] = now;
    };

    // Finds the first air block from bottom
    getLowHeight(relX: number) {
        let i = rxy2ci(relX, 0);
        while (i < ChunkBlockAmount && !BM[this.blocks[i]].canBePhased) i += ChunkLength;
        return (i - relX) / ChunkLength;
    };

    // Finds the last air block from top
    getHighHeight(relX: number) {
        let i = rxy2ci(relX, WorldHeight - 1);
        while (i >= 0 && BM[this.blocks[i]].canBePhased && i > 0) i -= ChunkLength;
        return (i - relX) / ChunkLength + 1;
    };

    // Finds the last air block from top
    getHighTransparentHeight(relX: number) {
        let i = rxy2ci(relX, WorldHeight - 1);
        while (i >= 0 && !BM[this.blocks[i]].isOpaque && i > 0) i -= ChunkLength;
        return (i - relX) / ChunkLength + 1;
    };

    serverUpdate(dt: number) {
        if (this.referees <= 0 && !this.isSpawnChunk && (this.unloadTimer -= dt) <= 0) return this.unload();

        for (const e of this.entities) {
            e.serverUpdate(dt);
        }
    };

    save() {
        if (!this.dirty) return;
        this.dirty = false;

        if (!this.world.chunksGenerated.has(this.x)) return;

        const buffer = ChunkStruct.serialize({
            blocks: this.blocks,
            entities: Array.from(this.entities).filter(i => !(i instanceof Player))
        });

        const compressed = zstdOptionalEncode(buffer);

        const versionBuffer = Buffer.allocUnsafe(compressed.length + 2);

        versionBuffer.writeUint16LE(WorldGenerationVersion);

        compressed.copy(versionBuffer, 2);

        this.world.setChunkBuffer(this.x, versionBuffer);
    };

    unload() {
        if (this.unloaded) return;
        this.unloaded = true;

        this.save();

        for (const entity of this.entities) {
            if (entity instanceof Player) {
                entity.kick("The chunk you were in was unloaded. Please contact the server owner.");
            }
        }

        delete this.world.chunks[this.x];
    };

    getBlock(relX: number, y: number): ItemMetadata {
        if (relX < 0) return this.world.getBlock(cx2x(this.x) + relX, y);
        if (relX >= ChunkLength) return this.world.getBlock(cx2x(this.x) + relX - ChunkLength, y);
        if (y < 0 || y >= WorldHeight) return BM[0];
        return BM[this.blocks[rxy2ci(relX, y)]];
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

    updateLight(relX: number, y: number) {
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