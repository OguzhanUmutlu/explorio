import {Damage} from "@/entity/Damage";
import {Entity} from "@/entity/Entity";

export class DrownDamage extends Damage {
    constructor(entity: Entity) {
        super(entity, 1);
    };
}