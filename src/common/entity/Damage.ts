import Entity from "@/entity/Entity";

export abstract class Damage<Cause> {
    constructor(public entity: Entity, public cause: Cause, public damage: number) {
    };

    get finalDamage() {
        // todo: handle armor
        return this.damage;
    };
}