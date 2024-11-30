import Vector2 from "$/utils/Vector2";
import World from "$/world/World";

export function getRotationTowards(x1: number, y1: number, x2: number, y2: number) {
    return Math.atan2(x2 - x1, y2 - y1) / Math.PI * 180 - 90;
}

export default class Location extends Vector2 {
    constructor(x: number, y: number, public rotation: number = 0, public world: World) {
        super(x, y);
    };

    copy() {
        return new Location(this.x, this.y, this.rotation, this.world);
    };

    copyFrom(loc: Location) {
        this.x = loc.x;
        this.y = loc.y;
        this.rotation = loc.rotation;
        this.world = <any>loc.world;
    };

    getRotationTowards(x: number, y: number, xOffset = 0, yOffset = 0) {
        return Math.atan2(x - (this.x + xOffset), y - (this.y + yOffset)) / Math.PI * 180 - 90;
    };
}