import Position from "@/utils/Position";
import World from "@/world/World";

export default abstract class Particle extends Position {
    done = false;

    protected constructor(x: number, y: number, world: World) {
        super(x, y, 0, world);
    };

    abstract update(dt: number): void;
    abstract render(ctx: CanvasRenderingContext2D, x: number, y: number, tileSize: number): void;
}