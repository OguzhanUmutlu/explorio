import Effect from "@/effect/Effect";
import {EffectIds} from "@/meta/Effects";
import {registerAny} from "@/utils/Inits";
import Entity, {DefaultWalkSpeed} from "@/entity/Entity";

export default class SlownessEffect extends Effect {
    static _ = registerAny(this);
    typeId = EffectIds.Slowness;
    typeName = "slowness";
    name = "Slowness";

    apply(entity: Entity, amplifier: number) {
        entity.walkSpeed /= amplifier;
    };

    remove(entity: Entity) {
        entity.walkSpeed = DefaultWalkSpeed;
    };
}