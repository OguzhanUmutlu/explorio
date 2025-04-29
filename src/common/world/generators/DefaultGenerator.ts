import Generator from "@/world/generators/Generator";
import {FullIds, ItemIds} from "@/meta/ItemIds";
import {createNoise2D, NoiseFunction2D} from "simplex-noise";
import alea from "alea";
import World from "@/world/World";
import {ChunkLength} from "@/meta/WorldConstants";
import {im2f, TreeType} from "@/meta/Items";

export const MountainHeight = 30;
export const WaterHeight = 10;
export const SurfaceHeight = 172;
export const CaveScaleX = 60;
export const CaveScaleY = 25;

function generateLeavesForGivenLogs(logs: [number, number][], minY: number) {
    const leaves: [number, number][] = [];

    const xs = logs.map(l => l[0]);
    const ys = logs.map(l => l[1]);
    const minLogX = Math.min(...xs);
    const minLogY = Math.min(...ys);
    const maxLogX = Math.max(...xs);
    const maxLogY = Math.max(...ys);

    for (const log of logs) for (let x = minLogX - 2; x <= maxLogX + 2; x++) {
        for (let y = Math.max(minY, minLogY - 2); y <= maxLogY + 2; y++) {
            if (leaves.some(i => i[0] === x && i[1] === y)) continue;
            const dist = Math.round(Math.sqrt((x - log[0]) ** 2 + (y - log[1]) ** 2));
            if (dist <= 2) {
                // basically putting leaves around the logs with 2 distance.
                leaves.push([x, y]);
            }
        }
    }

    return leaves;
}

function prepareTree(logs: [number, number][], minY: number) {
    return {
        logs,
        leaves: generateLeavesForGivenLogs([[0, 0], ...logs], minY),
        minY
    };
}

// by default trees will have a base log of some length.
// [0,0] is the last piece of log that is put in these configs below.
// you can put more logs in special ways if you want.
// then the minY is again relative to the last log.
// minY=0 would make the last log be the minY resulting in it having leaves around it.
export const TreeLeavesShape = [
    prepareTree([], 0), // oak
    prepareTree([], 0), // dark oak
    prepareTree([], 0), // birch
    prepareTree([], 0), // jungle
    prepareTree([], 0), // spruce
    prepareTree([[1, 1], [2, 2]], 0), // acacia
    prepareTree([], 0), // mangrove
    prepareTree([], 0), // pale oak
    prepareTree([], 0), // azalea
    prepareTree([], 0) // cherry
];

export default class DefaultGenerator extends Generator {
    noise: NoiseFunction2D;
    noiseCoal: NoiseFunction2D;
    noiseIron: NoiseFunction2D;
    noiseGold: NoiseFunction2D;
    noiseLapis: NoiseFunction2D;
    noiseRedstone: NoiseFunction2D;
    noiseDiamond: NoiseFunction2D;

    setWorld(world: World) {
        super.setWorld(world);

        this.noise = createNoise2D(alea(world.seed));
        this.noiseCoal = createNoise2D(alea(world.seed + 1));
        this.noiseIron = createNoise2D(alea(world.seed + 2));
        this.noiseGold = createNoise2D(alea(world.seed + 3));
        this.noiseLapis = createNoise2D(alea(world.seed + 4));
        this.noiseRedstone = createNoise2D(alea(world.seed + 5));
        this.noiseDiamond = createNoise2D(alea(world.seed + 6));
    };

    static isCave(y: number, noise: number) {
        return y < SurfaceHeight - MountainHeight + 7 && noise >= 0.1 && noise <= 0.4;
    };

    static plantTree(world: World, chunk: Uint16Array, noise: number, biome: number, x: number, y: number, worldX: number) {
        const treeType = DefaultGenerator.getBiomeFromNoise(biome);
        let treeLength = Math.floor(noise + 5);
        switch (treeType) {
            case TreeType.Spruce:
            case TreeType.Acacia:
                treeLength += 3;
                break;
            case TreeType.Jungle:
                treeLength += 8;
                break;
        }
        chunk[x + (y - 1) * ChunkLength] = FullIds.DIRT;

        for (let i = 0; i < treeLength; i++) {
            chunk[x + (i + y) * ChunkLength] = im2f(ItemIds.NATURAL_LOG, treeType);
        }

        const shape = TreeLeavesShape[treeType];
        for (let i = 0; i < shape.logs.length; i++) {
            const [X, Y] = shape.logs[i];
            world.setBlockIfEmpty(worldX + X, treeLength + y + Y - 1, ItemIds.NATURAL_LOG, treeType);
        }

        for (let i = 0; i < shape.leaves.length; i++) {
            const [X, Y] = shape.leaves[i];
            world.setBlockIfEmpty(worldX + X, treeLength + y + Y - 1, ItemIds.LEAVES, treeType);
        }
        return treeLength;
    };

    getChunkNoise(chunkX: number) {
        return this.noise(chunkX / 3, 0);
    };

    static getBiomeFromNoise(noise: number) {
        return Math.floor(Math.abs(noise) * TreeType.length);
    };

    getBiomeAtChunk(chunkX: number) {
        return DefaultGenerator.getBiomeFromNoise(this.getChunkNoise(chunkX));
    };

    generate(chunkX: number): void {
        const world = this.world;
        const chunk = world.chunks[chunkX].blocks;
        const chunkXM = chunkX * ChunkLength;
        let treeX = 0;
        const chunkNoise = this.getChunkNoise(chunkX);

        for (let x = 0; x < ChunkLength; x++) {
            const worldX = x + chunkXM;
            chunk[x] = FullIds.BEDROCK;
            const height = Math.floor(this.noise(worldX / 80, 0) * MountainHeight + WaterHeight + SurfaceHeight);
            // const heightNoise = this.noise(worldX / CaveScaleX, height / CaveScaleY);

            let hasTree = false;
            if (x === treeX && height >= SurfaceHeight/* && !DefaultGenerator.isCave(height, heightNoise)*/) {
                const noi = this.noise(worldX / 5, 10);
                treeX += Math.floor(Math.abs(noi) * 3 + 3);
                if (x != ChunkLength - 1) {
                    hasTree = true;
                    DefaultGenerator.plantTree(world, chunk, noi, chunkNoise, x, height + 1, worldX);
                }
            }

            if (height < SurfaceHeight) {
                for (let y = height; y < SurfaceHeight; y++) {
                    chunk[x + y * ChunkLength] = FullIds.WATER;
                }
            }

            for (let y = height; y >= 1; y--) {
                const caveNoise = this.noise(worldX / CaveScaleX, y / CaveScaleY);
                if (DefaultGenerator.isCave(y, caveNoise)) {
                    if (y < 11) {
                        chunk[x + y * ChunkLength] = FullIds.LAVA;
                    }
                    continue;
                }

                let id = FullIds.AIR;
                if (y > height - 5) {
                    if (y !== height) id = FullIds.DIRT;
                    if (height < SurfaceHeight) id = FullIds.SAND;
                    else if (height < SurfaceHeight + 5) id = FullIds.GRAVEL;
                }
                if (y === height && id === FullIds.AIR) id = hasTree ? FullIds.DIRT : FullIds.GRASS_BLOCK;
                if (y <= height - 5) {
                    const deepslate = y < 64 + Math.floor(this.noise(worldX / 40, y / 40) * 10);
                    id = deepslate ? FullIds.DEEPSLATE : FullIds.STONE;
                    const noiCoal = this.noiseCoal(worldX / 35, y / 35);
                    if (noiCoal >= 0.85) id = deepslate ? FullIds.DEEPSLATE_COAL_ORE : FullIds.COAL_ORE;
                    const noiIron = this.noiseIron(worldX / 15, y / 15);
                    if (noiIron >= 0.85) id = deepslate ? FullIds.DEEPSLATE_IRON_ORE : FullIds.IRON_ORE;
                    if (y < 130) {
                        const noiGold = this.noiseGold(worldX / 15, y / 15);
                        if (noiGold >= 0.9) id = deepslate ? FullIds.DEEPSLATE_GOLD_ORE : FullIds.GOLD_ORE;
                        const noiLapis = this.noiseLapis(worldX / 15, y / 15);
                        if (noiLapis >= 0.9) id = deepslate ? FullIds.DEEPSLATE_LAPIS_ORE : FullIds.LAPIS_ORE;
                        const noiseRedstone = this.noiseRedstone(worldX / 15, y / 15);
                        if (noiseRedstone >= 0.9) id = deepslate ? FullIds.DEEPSLATE_REDSTONE_ORE : FullIds.REDSTONE_ORE;
                    }
                    if (y < 20) {
                        const noiDiamond = this.noiseDiamond(worldX, y);
                        if (noiDiamond >= 0.9) id = deepslate ? FullIds.DEEPSLATE_DIAMOND_ORE : FullIds.DIAMOND_ORE;
                    }
                }
                chunk[x + y * ChunkLength] = id;
            }
        }
    };
}