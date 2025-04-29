import {Damage} from "@/entity/Damage";
import {Block} from "@/block/Block";
import Entity from "@/entity/Entity";

export class FallDamage extends Damage<Block> {
    constructor(entity: Entity, cause: Block, public distance: number) {
        super(entity, cause, distance > 3 ? (distance - 2.5) * 2 : 0);
    };
}