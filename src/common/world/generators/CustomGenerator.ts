import Generator from "@/world/generators/Generator";
import {ItemIds} from "@/meta/ItemIds";
import World from "@/world/World";
import {createNoise2D, NoiseFunction2D} from "simplex-noise";
import alea from "alea";
import DefaultGenerator from "@/world/generators/DefaultGenerator";
import {im2f} from "@/meta/ItemInformation";
import {ChunkLength} from "@/meta/WorldConstants";

export default class CustomGenerator extends Generator {
    processedPattern: [number, number | string][][];
    noise: NoiseFunction2D;

    constructor(public pattern: string) {
        super();
        this.processedPattern = [];
        const split = pattern.split(";");
        for (let i = 0; i < split.length; i++) {
            const pat = split[i];
            if (pat.length === 0) {
                this.processedPattern.push([]);
                continue;
            }
            const names = pat.split(",");
            const items: [number, number | string][] = [];
            for (let name of names) {
                if (name.length === 0) {
                    items.push([0, 0]);
                    continue;
                }
                let times = 1;
                if (name.includes("*")) {
                    times = +name.substring(0, name.indexOf("*"));
                    name = name.substring(name.indexOf("*") + 1);
                }

                items.push([times, name[0] === ":" ? name : ItemIds[name.toUpperCase()]]);
            }

            this.processedPattern.push(items);
        }
    };

    setWorld(world: World) {
        super.setWorld(world);

        this.noise = createNoise2D(alea(this.world.seed));
    };

    generate(chunkX: number): void {
        const world = this.world;
        const chunk = world.chunks[chunkX].blocks;
        const chunkXM = chunkX * ChunkLength;
        const chunkNoise = this.noise(chunkX / 60, 0);

        for (let x = 0; x < ChunkLength; x++) {
            const worldX = chunkXM + x;
            let y = 0;
            for (const possible of this.processedPattern) {
                const chosen = possible[Math.floor((this.noise(worldX, 0) / 2 + 0.5) * possible.length)];
                const times = chosen[0];
                const block = chosen[1];
                for (let j = 0; j < times; j++) {
                    if (block === ":tree") {
                        y += DefaultGenerator.plantTree(world, chunk, this.noise(worldX / 5, y / 5), chunkNoise, x, y, worldX) + 2;
                    } else if (typeof block === "number") {
                        chunk[x + y++ * ChunkLength] = im2f(block);
                    }
                }
            }
        }
    };
}