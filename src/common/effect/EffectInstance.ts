import {Effect} from "@explorio/effect/Effect";
import {Entity} from "@explorio/entity/Entity";

export class EffectInstance {
    constructor(public effect: Effect, public amplifier: number, public time: number) {
    };

    apply(entity: Entity) {
        this.effect.apply(entity, this.amplifier);
    };

    remove(entity: Entity) {
        this.effect.remove(entity);
    };
}