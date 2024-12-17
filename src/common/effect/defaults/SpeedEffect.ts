import Effect from "@/effect/Effect";
import Entity, {DefaultWalkSpeed} from "@/entity/Entity";
import {EffectIds} from "@/utils/Effects";

export default class SpeedEffect extends Effect {
    id = EffectIds.Speed;

    apply(entity: Entity, amplifier: number) {
        entity.walkSpeed *= amplifier;
    };

    remove(entity: Entity) {
        entity.walkSpeed = DefaultWalkSpeed;
    };
}