import Effect from "@/effect/Effect";
import Entity from "@/entity/Entity";


export default class EffectInstance {
    constructor(public effect: Effect, public amplifier: number, public time: number) {
    };

    apply(entity: Entity) {
        this.effect.apply(entity, this.amplifier);
    };

    timeout(entity: Entity) {
        this.effect.timeout(entity);
    };
}