import {Entity} from "../Entity";
import {BoundingBox} from "../BoundingBox";
import {Entities, EntityBoundingBoxes} from "../../meta/Entities";
import {Inventory} from "../../item/Inventory";

export class PlayerEntity extends Entity {
    typeId = Entities.PLAYER;
    rotation = 0;
    bb: BoundingBox = EntityBoundingBoxes[Entities.PLAYER].copy();

    hotbar = new Inventory(9);
    inventory = new Inventory(27);
    armorInventory = new Inventory(4);
    cursor = new Inventory(1);
    chest = new Inventory(27);
    doubleChest = new Inventory(54);
    crafting2x2 = new Inventory(5);
    crafting3x3 = new Inventory(10);

    handIndex = 0;

    getMovementData(): any {
        return {
            ...super.getMovementData(),
            rotation: this.rotation
        };
    };

    get handItem() {
        return this.hotbar.get(this.handIndex);
    };
}