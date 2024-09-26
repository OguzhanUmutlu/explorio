import {SEntity} from "./SEntity";
import {SWorld} from "../world/SWorld";
import {ItemEntity} from "../../common/entity/types/ItemEntity";
import {Item} from "../../common/item/Item";
import {DEFAULT_GRAVITY} from "../../common/entity/Entity";

export class SItemEntity extends ItemEntity implements SEntity {
    constructor(public item: Item, world: SWorld) {
        super(world);
        this.gravity = DEFAULT_GRAVITY;
    };
}