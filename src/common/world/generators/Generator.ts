import World from "$/world/World";

export default abstract class Generator {
    world: World;

    protected constructor() {
    };

    setWorld(world: World) {
        this.world = world;
    };

    abstract generate(chunkX: number): void;
}