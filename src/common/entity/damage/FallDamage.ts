import {Block} from "@/block/Block";
import {Entity} from "@/entity/Entity";
import {Damage} from "@/entity/Damage";

export class FallDamage extends Damage {
    constructor(entity: Entity, public cause: Block, public distance: number) {
        super(entity, distance > 3 ? (distance - 2.5) * 2 : 0);
    };

    getEPF() {
        return this.entity.getFeatherFallingLevel() * 2;
    };
}