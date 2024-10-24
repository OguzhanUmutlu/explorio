import {Vector2} from "./Vector2";

export class RotatedPosition extends Vector2 {

    constructor(x: number, y: number, public rotation: number = 0) {
        super(x, y);
    };

    copy(): RotatedPosition {
        return new RotatedPosition(this.x, this.y, this.rotation);
    };
}