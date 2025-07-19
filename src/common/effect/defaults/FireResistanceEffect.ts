import Effect from "@/effect/Effect";
import {EffectIds} from "@/meta/Effects";
import Entity from "@/entity/Entity";

export default class FireResistanceEffect extends Effect {
    typeId = EffectIds.FireResistance;
    typeName = "fire_resistance";
    name = "Fire Resistance";

    apply(entity: Entity, _: number) {
        entity.fireImmunity = true;
    };
}