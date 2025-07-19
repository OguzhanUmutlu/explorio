import {Damage} from "@/entity/Damage";
import Entity from "@/entity/Entity";

export class ProjectileDamage extends Damage {
    constructor(entity: Entity, public cause: Entity, public damage: number) {
        super(entity, damage);
    };

    getEPF() {
        return this.entity.getProjectileProtectionLevel() * 2;
    };
}