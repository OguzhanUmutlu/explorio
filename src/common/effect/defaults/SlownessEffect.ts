import Effect from "@/effect/Effect";
import Entity, {DefaultWalkSpeed} from "@/entity/Entity";
import {EffectIds} from "@/utils/Effects";

export default class SlownessEffect extends Effect {
    id = EffectIds.Slowness;

    apply(entity: Entity, amplifier: number) {
        entity.walkSpeed /= amplifier;
    };

    remove(entity: Entity) {
        entity.walkSpeed = DefaultWalkSpeed;
    };
}