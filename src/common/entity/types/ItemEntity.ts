import {Entity} from "../Entity";
import {BoundingBox} from "../BoundingBox";
import {Entities, EntityBoundingBoxes} from "../../meta/Entities";
import {Item} from "../../item/Item";

export class ItemEntity extends Entity {
    typeId = Entities.ITEM;
    typeName = "item";
    name = "Item";
    bb: BoundingBox = EntityBoundingBoxes[Entities.ITEM].copy();
    item: Item;

    serverUpdate(dt: number) {
        super.serverUpdate(dt);
    };

    updateCollisionBox() {
        super.updateCollisionBox();
        this.bb.x = this.x - this.bb.width / 2;
        this.bb.y = this.y;
    };
}