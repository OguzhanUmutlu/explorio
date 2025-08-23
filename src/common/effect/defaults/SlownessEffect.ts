import {Effect} from "@/effect/Effect";
import {EffectIds} from "@/meta/Effects";
import {Entity} from "@/entity/Entity";

export class SlownessEffect extends Effect {
    typeId = EffectIds.Slowness;
    typeName = "slowness";
    name = "Slowness";

    apply(entity: Entity, amplifier: number) {
        entity.walkSpeed /= amplifier;
    };
}