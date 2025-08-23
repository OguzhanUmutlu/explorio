import X from "stramp";
import {EffectIds} from "@/meta/Effects";
import EffectInstance from "@/effect/EffectInstance";
import Server from "@/Server";
import Effect from "@/effect/Effect";

const BaseEffectInstance = X.object.struct({
    id: X.getUnsignedTypeOf(EffectIds.length),
    amplifier: X.u8,
    time: X.u32
});

export const EffectInstanceStruct = BaseEffectInstance.highway<EffectInstance>(
    effect => {
        if (!(effect instanceof EffectInstance)) throw BaseEffectInstance.makeProblem("Not an EffectInstance");
        return {id: effect.effect.typeId, amplifier: effect.amplifier, time: effect.time};
    },
    eff => new EffectInstance(Server.instance.registeredEffects[eff.id], eff.amplifier, eff.time),
    null
);

export const EffectStruct = X.u8.highway<Effect>(
    eff => {
        if (!(eff instanceof Effect)) throw X.u8.makeProblem("Not an Effect instance");
        return eff.typeId;
    },
    id => Server.instance.registeredEffects[id],
    null
);