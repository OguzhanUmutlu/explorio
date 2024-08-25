import {Generator} from "./Generator";
import {ItemIds} from "../../Items";
import {CAVE_SCALE, Chunk, CHUNK_LENGTH, SURFACE_HEIGHT, World} from "../World";
import {createNoise2D, NoiseFunction2D} from "simplex-noise";
import alea from "alea";

export class DefaultGenerator extends Generator {
    noise: NoiseFunction2D;
    noiseCoal: NoiseFunction2D;
    noiseIron: NoiseFunction2D;
    noiseGold: NoiseFunction2D;
    noiseLapis: NoiseFunction2D;
    noiseRedstone: NoiseFunction2D;
    noiseDiamond: NoiseFunction2D;

    setWorld(world) {
        super.setWorld(world);

        this.noise = createNoise2D(alea(world.seed));
        this.noiseCoal = createNoise2D(alea(world.seed + 1));
        this.noiseIron = createNoise2D(alea(world.seed + 2));
        this.noiseGold = createNoise2D(alea(world.seed + 3));
        this.noiseLapis = createNoise2D(alea(world.seed + 4));
        this.noiseRedstone = createNoise2D(alea(world.seed + 5));
        this.noiseDiamond = createNoise2D(alea(world.seed + 6));
    };

    static plantTree(world: WorldType, chunk: Chunk, metaChunks: Chunk, noi: number, x: number, y: number, worldX: number) {
        const treeLength = Math.floor(noi + 5);
        for (let i = 0; i < treeLength; i++) {
            chunk[x + (i + y) * CHUNK_LENGTH] = ItemIds.NATURAL_LOG;
        }
        for (let [X, Y] of [
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
        ]) world.setBlock(
            worldX + X, treeLength + y + Y,
            ItemIds.LEAVES, 0, false
        );
        return treeLength;
    };

    generate(chunkX): void {
        const world = this.world;
        const chunk = world.chunks[chunkX];
        const metaChunks = world.metaChunks[chunkX];
        const chunkXM = chunkX * CHUNK_LENGTH;
        let treeX = 0;

        for (let x = 0; x < CHUNK_LENGTH; x++) {
            const worldX = x + chunkXM;
            chunk[x] = 1;
            const height = Math.floor(this.noise(worldX / 50, 0) * 12 + SURFACE_HEIGHT);
            const heightNoise = this.noise(worldX / CAVE_SCALE, height / CAVE_SCALE);
            if (x === treeX && heightNoise < 0.4) {
                const noi = this.noise(worldX / 5, 10);
                treeX += Math.floor(Math.abs(noi) * 3 + 3);
                if (x != CHUNK_LENGTH - 1) {
                    DefaultGenerator.plantTree(world, chunk, metaChunks, noi, x, height + 1, worldX);
                }
            }
            for (let y = height; y >= 1; y--) {
                const noi = this.noise(worldX / CAVE_SCALE, y / CAVE_SCALE);
                if (noi >= 0.4 && y < height - 6) {
                    if (y < 11) {
                        chunk[x + y * CHUNK_LENGTH] = ItemIds.LAVA;
                    }
                    continue;
                }
                let id = 0;
                if (y > height - 5) id = ItemIds.DIRT;
                if (y === height) id = ItemIds.GRASS_BLOCK;
                if (y <= height - 5) {
                    const deepslate = y < 64 + Math.floor(this.noise(worldX / 40, y / 40) * 10);
                    id = deepslate ? ItemIds.DEEPSLATE : ItemIds.STONE;
                    const noiCoal = this.noiseCoal(worldX / 35, y / 35);
                    if (noiCoal >= 0.85) id = deepslate ? ItemIds.DEEPSLATE_COAL_ORE : ItemIds.COAL_ORE;
                    const noiIron = this.noiseIron(worldX / 15, y / 15);
                    if (noiIron >= 0.85) id = deepslate ? ItemIds.DEEPSLATE_IRON_ORE : ItemIds.IRON_ORE;
                    if (y < 130) {
                        const noiGold = this.noiseGold(worldX / 15, y / 15);
                        if (noiGold >= 0.9) id = deepslate ? ItemIds.DEEPSLATE_GOLD_ORE : ItemIds.GOLD_ORE;
                        const noiLapis = this.noiseLapis(worldX / 15, y / 15);
                        if (noiLapis >= 0.9) id = deepslate ? ItemIds.DEEPSLATE_LAPIS_ORE : ItemIds.LAPIS_ORE;
                        const noiseRedstone = this.noiseRedstone(worldX / 15, y / 15);
                        if (noiseRedstone >= 0.9) id = deepslate ? ItemIds.DEEPSLATE_REDSTONE_ORE : ItemIds.REDSTONE_ORE;
                    }
                    if (y < 20) {
                        const noiDiamond = this.noiseDiamond(worldX, y);
                        if (noiDiamond >= 0.9) id = deepslate ? ItemIds.DEEPSLATE_DIAMOND_ORE : ItemIds.DIAMOND_ORE;
                    }
                }
                chunk[x + y * CHUNK_LENGTH] = id;
            }
        }
    };
}