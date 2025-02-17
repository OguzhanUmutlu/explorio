import X, {Bin, BufferIndex} from "stramp";
import {StrampProblem} from "stramp/src/StrampProblem";
import {EffectIds, Effects} from "@/meta/Effects";
import EffectInstance from "@/effect/EffectInstance";

const BaseStruct = X.object.struct({
    id: X.any.ofValues(...<EffectIds[]>Object.values(EffectIds)),
    amplifier: X.u8,
    time: X.u32
});

export const EffectInstanceStruct = new class extends Bin<EffectInstance> {
    name = "EffectInstance";

    unsafeWrite(bind: BufferIndex, value: EffectInstance): void {
        BaseStruct.unsafeWrite(bind, {id: value.effect.id, amplifier: value.amplifier, time: value.time});
    };

    read(bind: BufferIndex): EffectInstance {
        const obj = BaseStruct.read(bind);
        return new EffectInstance(Effects[obj.id], obj.amplifier, obj.time);
    };

    unsafeSize(): number {
        return 1;
    };

    findProblem(value: EffectInstance): StrampProblem | void {
        if (!(value instanceof EffectInstance)) return this.makeProblem("Not an Effect");
    };

    get sample(): EffectInstance {
        return new EffectInstance(Effects[0], 0, 0);
    };
}