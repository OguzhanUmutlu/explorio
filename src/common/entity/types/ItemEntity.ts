import {Entity} from "../Entity";
import {BoundingBox} from "../BoundingBox";
import {Entities, EntityBoundingBoxes} from "../../meta/Entities";
import {Item} from "../../item/Item";
import {Player} from "@explorio/entity/types/Player";

export class ItemEntity extends Entity {
    typeId = Entities.ITEM;
    typeName = "item";
    name = "Item";
    bb: BoundingBox = EntityBoundingBoxes[Entities.ITEM].copy();
    item: Item;

    serverUpdate(dt: number) {
        for (const entity of this.getChunkEntities()) {
            if (entity instanceof Player) {
                entity.addItem(this.item);
                this.despawn();
                return;
            }
        }

        super.serverUpdate(dt);
    };

    updateCollisionBox() {
        super.updateCollisionBox();
        this.bb.x = this.x - this.bb.width / 2;
        this.bb.y = this.y;
    };
}