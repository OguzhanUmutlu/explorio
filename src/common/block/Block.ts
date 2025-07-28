import BlockData from "@/item/BlockData";
import Position from "@/utils/Position";
import Texture from "@/utils/Texture";
import World from "@/world/World";

export class Block extends Position {
    declare readonly x: number;
    declare readonly y: number;
    declare readonly world: World;
    readonly = true;

    constructor(world: World, x: number, y: number, public data: BlockData) {
        super(x, y, 0, world);
    };

    getTexture(meta = this.data.meta, block = false): Texture {
        return this.data.getTexture(meta, block, this.world, this.x, this.y);
    };
}