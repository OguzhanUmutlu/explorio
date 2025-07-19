import {Damage} from "@/entity/Damage";
import {Block} from "@/block/Block";
import Entity from "@/entity/Entity";

export class FireDamage extends Damage {
    constructor(entity: Entity, public cause: Block, public damage: number) {
        super(entity, damage);
    };

    getEPF() {
        return this.entity.getFireProtectionLevel() * 2;
    };
}