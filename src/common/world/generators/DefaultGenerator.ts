import Generator from "@/world/generators/Generator";
import {B, I} from "@/meta/ItemIds";
import {createNoise2D, NoiseFunction2D} from "simplex-noise";
import alea from "alea";
import World, {ChunkData} from "@/world/World";
import {ChunkLength} from "@/meta/WorldConstants";

export const SurfaceHeight = 172;
export const CaveScale = 40;

export const TreeShape = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [-1, -1],
    [1, -1],
    [-2, -1],
    [2, -1],
    [-2, 0],
    [2, 0],
    [-1, 1],
    [0, 1],
    [1, 1]
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

    static plantTree(world: World, chunk: ChunkData, noi: number, x: number, y: number, worldX: number) {
        const treeLength = Math.floor(noi + 5);
        for (let i = 0; i < treeLength; i++) {
            chunk[x + (i + y) * ChunkLength] = B.NATURAL_LOG;
        }
        for (let i = 0; i < TreeShape.length; i++) {
            const [X, Y] = TreeShape[i];
            world.setBlock(
                worldX + X, treeLength + y + Y,
                I.LEAVES, 0, false
            );
        }
        return treeLength;
    };

    generate(chunkX: number): void {
        const world = this.world;
        const chunk = world.chunks[chunkX];
        const chunkXM = chunkX * ChunkLength;
        let treeX = 0;

        for (let x = 0; x < ChunkLength; x++) {
            const worldX = x + chunkXM;
            chunk[x] = B.BEDROCK;
            const height = Math.floor(this.noise(worldX / 50, 0) * 12 + SurfaceHeight);
            const heightNoise = this.noise(worldX / CaveScale, height / CaveScale);
            if (x === treeX && heightNoise < 0.4) {
                const noi = this.noise(worldX / 5, 10);
                treeX += Math.floor(Math.abs(noi) * 3 + 3);
                if (x != ChunkLength - 1) {
                    DefaultGenerator.plantTree(world, chunk, noi, x, height + 1, worldX);
                }
            }
            for (let y = height; y >= 1; y--) {
                const noi = this.noise(worldX / CaveScale, y / CaveScale);
                if (noi >= 0.4 && y < height - 6) {
                    if (y < 11) {
                        chunk[x + y * ChunkLength] = B.LAVA;
                    }
                    continue;
                }

                let id = B.AIR;
                if (y > height - 5) id = B.DIRT;
                if (y === height) id = B.GRASS_BLOCK;
                if (y <= height - 5) {
                    const deepslate = y < 64 + Math.floor(this.noise(worldX / 40, y / 40) * 10);
                    id = deepslate ? B.DEEPSLATE : B.STONE;
                    const noiCoal = this.noiseCoal(worldX / 35, y / 35);
                    if (noiCoal >= 0.85) id = deepslate ? B.DEEPSLATE_COAL_ORE : B.COAL_ORE;
                    const noiIron = this.noiseIron(worldX / 15, y / 15);
                    if (noiIron >= 0.85) id = deepslate ? B.DEEPSLATE_IRON_ORE : B.IRON_ORE;
                    if (y < 130) {
                        const noiGold = this.noiseGold(worldX / 15, y / 15);
                        if (noiGold >= 0.9) id = deepslate ? B.DEEPSLATE_GOLD_ORE : B.GOLD_ORE;
                        const noiLapis = this.noiseLapis(worldX / 15, y / 15);
                        if (noiLapis >= 0.9) id = deepslate ? B.DEEPSLATE_LAPIS_ORE : B.LAPIS_ORE;
                        const noiseRedstone = this.noiseRedstone(worldX / 15, y / 15);
                        if (noiseRedstone >= 0.9) id = deepslate ? B.DEEPSLATE_REDSTONE_ORE : B.REDSTONE_ORE;
                    }
                    if (y < 20) {
                        const noiDiamond = this.noiseDiamond(worldX, y);
                        if (noiDiamond >= 0.9) id = deepslate ? B.DEEPSLATE_DIAMOND_ORE : B.DIAMOND_ORE;
                    }
                }
                chunk[x + y * ChunkLength] = id;
            }
        }
    };
}