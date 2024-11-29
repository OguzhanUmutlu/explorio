import {Effect} from "@explorio/effect/Effect";
import {Entity} from "@explorio/entity/Entity";
import {EffectIds} from "@explorio/utils/Effects";

export class SpeedEffect extends Effect {
    id = EffectIds.Speed;

    apply(entity: Entity, amplifier: number) {
        entity.walkSpeed *= amplifier;
    };

    remove(entity: Entity) {
        entity.walkSpeed = entity.defaultAttributes.walkSpeed;
    };
}