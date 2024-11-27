import {Vector2} from "@explorio/utils/Vector2";

export abstract class Particle extends Vector2 {
    done = false;
    abstract update(dt: number): void;
    abstract render(ctx: CanvasRenderingContext2D, x: number, y: number, tileSize: number): void;
}