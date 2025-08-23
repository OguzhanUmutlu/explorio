import {Block} from "@/block/Block";
import {Damage} from "@/entity/Damage";
import {Entity} from "@/entity/Entity";

export class ExplosionDamage extends Damage {
    constructor(entity: Entity, public cause: Block | Entity, public damage: number) {
        super(entity, damage);
    };

    getEPF() {
        return this.entity.getBlastProtectionLevel() * 2;
    };
}