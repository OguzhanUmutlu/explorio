import X, {Bin, BufferIndex} from "stramp";
import EffectInstance from "@/effect/EffectInstance";
import {StrampProblem} from "stramp/types/StrampProblem";
import {getServer} from "@/utils/Utils";

const BaseStruct = X.object.struct({
    id: X.u16, // should be big enough
    amplifier: X.u8,
    time: X.u32
});

export const EffectInstanceStruct = new class extends Bin<EffectInstance> {
    isOptional = false as const;
    name = "EffectInstance";

    unsafeWrite(bind: BufferIndex, value: EffectInstance): void {
        BaseStruct.unsafeWrite(bind, {id: value.effect.typeId, amplifier: value.amplifier, time: value.time});
    };

    read(bind: BufferIndex): EffectInstance {
        const obj = BaseStruct.read(bind);
        return new EffectInstance(getServer().registeredEffects[obj.id], obj.amplifier, obj.time);
    };

    unsafeSize(): number {
        return 1;
    };

    findProblem(value: EffectInstance): StrampProblem | void {
        if (!(value instanceof EffectInstance)) return this.makeProblem("Not an Effect");
    };

    get sample(): EffectInstance {
        throw new Error("Cannot sample EffectInstanceStruct");
    };
}