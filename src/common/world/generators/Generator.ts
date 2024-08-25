import {World} from "../World";

export abstract class Generator {
    world: World;

    protected constructor() {
    };

    setWorld(world: World) {
        this.world = world;
    };

    abstract generate(chunkX: number): void;
}