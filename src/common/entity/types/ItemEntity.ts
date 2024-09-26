import {Entity} from "../Entity";
import {BoundingBox} from "../BoundingBox";
import {Entities, EntityBoundingBoxes} from "../../meta/Entities";

export class ItemEntity extends Entity {
    typeId = Entities.ITEM;
    bb: BoundingBox = EntityBoundingBoxes[Entities.ITEM].copy();

    serverUpdate(dt: number) {
        super.serverUpdate(dt);
    };
}