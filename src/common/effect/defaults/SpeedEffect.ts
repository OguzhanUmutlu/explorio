import Effect from "@/effect/Effect";
import {EffectIds} from "@/meta/Effects";
import Entity from "@/entity/Entity";

export default class SpeedEffect extends Effect {
    typeId = EffectIds.Speed;
    typeName = "speed";
    name = "Speed";

    apply(entity: Entity, amplifier: number) {
        entity.walkSpeed *= amplifier;
    };
}