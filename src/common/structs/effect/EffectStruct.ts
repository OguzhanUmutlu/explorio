import {Bin, BufferIndex} from "stramp";
import Effect from "@/effect/Effect";
import {StrampProblem} from "stramp/types/StrampProblem";
import {getServer} from "@/utils/Utils";

export const EffectStruct = new class extends Bin<Effect> {
    isOptional = false as const;
    name = "Effect";

    unsafeWrite(bind: BufferIndex, value: Effect): void {
        bind.push(value.typeId);
    };

    read(bind: BufferIndex): Effect {
        return getServer().registeredEffects[bind.shift()];
    };

    unsafeSize(): number {
        return 1;
    };

    findProblem(value: Effect): StrampProblem | void {
        if (!(value instanceof Effect)) return this.makeProblem("Not an Effect");
    };

    get sample(): Effect {
        throw new Error("Cannot sample EffectStruct");
    };
}