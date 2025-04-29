import World from "@/world/World";
import {x2cx} from "@/utils/Utils";

export default abstract class Generator {
    world: World;

    protected constructor() {
    };

    setWorld(world: World) {
        this.world = world;
    };

    getBiomeAt(x: number): number {
        return this.getBiomeAtChunk(x2cx(x));
    };

    getBiomeAtChunk(_chunkX: number): number {
        return 0;
    };

    abstract generate(chunkX: number): void;
}