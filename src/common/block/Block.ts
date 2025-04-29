import BlockData from "@/item/BlockData";
import Position from "@/utils/Position";

export class Block {
    constructor(public position: Position, public data: BlockData) {
    };
}