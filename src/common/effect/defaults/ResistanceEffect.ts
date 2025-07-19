import Effect from "@/effect/Effect";
import {EffectIds} from "@/meta/Effects";
import Entity from "@/entity/Entity";

export default class ResistanceEffect extends Effect {
    typeId = EffectIds.Resistance;
    typeName = "resistance";
    name = "Resistance";

    apply(entity: Entity, amplifier: number) {
        entity.resistanceLevel = amplifier;
    };
}