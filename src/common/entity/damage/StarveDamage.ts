import {Damage} from "@/entity/Damage";
import Entity from "@/entity/Entity";

export class StarveDamage extends Damage<null> {
    constructor(entity: Entity) {
        super(entity, null, 1);
    };
}