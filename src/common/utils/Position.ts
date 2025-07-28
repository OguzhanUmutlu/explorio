import Vector2 from "@/utils/Vector2";
import World from "@/world/World";
import BlockData from "@/item/BlockData";
import {f2id, f2meta} from "@/meta/ItemInformation";

export function getRotationTowards(x1: number, y1: number, x2: number, y2: number) {
    return Math.atan2(x2 - x1, y2 - y1) / Math.PI * 180 - 90;
}

export default class Position extends Vector2 {
    readonly = false;

    constructor(x: number, y: number, public rotation: number = 0, public world: World) {
        super(x, y);
    };

    copyPosition() {
        return new Position(this.x, this.y, this.rotation, this.world);
    };

    setPositionFrom(loc: Position) {
        if (this.readonly) throw new Error("Cannot modify readonly Position");
        this.x = loc.x;
        this.y = loc.y;
        this.rotation = loc.rotation;
        this.world = loc.world;
    };

    getRotationTowards(x: number, y: number, xOffset = 0, yOffset = 0) {
        return Math.atan2(x - (this.x + xOffset), y - (this.y + yOffset)) / Math.PI * 180 - 90;
    };

    get blockIn(): BlockData {
        return this.world.getBlock(this.x, this.y);
    };

    set blockIn(block: BlockData | number) {
        this.world.setBlock(
            this.x, this.y,
            typeof block === "number" ? f2id(block) : block.id,
            typeof block === "number" ? f2meta(block) : block.meta
        );
    };

    up() {
        return new Position(this.x, this.y + 1, this.rotation, this.world);
    };

    down() {
        return new Position(this.x, this.y - 1, this.rotation, this.world);
    };

    right() {
        return new Position(this.x + 1, this.y, this.rotation, this.world);
    };

    left() {
        return new Position(this.x - 1, this.y, this.rotation, this.world);
    };

    get chunk() {
        return this.world.getChunk(this.chunkX, false);
    };

    getChunkEntities() {
        return this.chunk.entities;
    };

    getChunkTiles() {
        return this.chunk.tiles;
    };
}