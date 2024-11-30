import {Bin, BufferIndex} from "stramp";
import Effect from "$/effect/Effect";
import {StrampProblem} from "stramp/src/StrampProblem";
import {EffectIds, Effects} from "$/utils/Effects";

export const EffectStruct = new class extends Bin<Effect> {
    name = "Effect";

    unsafeWrite(bind: BufferIndex, value: Effect): void {
        bind.push(value.id);
    };

    read(bind: BufferIndex): Effect {
        return Effects[bind.shift()];
    };

    unsafeSize(): number {
        return 1;
    };

    findProblem(value: any): StrampProblem | void {
        if (!(value instanceof Effect)) return this.makeProblem("Not an Effect");
    };

    get sample(): Effect {
        return Effects[EffectIds.MiningFatigue]; // As a child I yearned for the mines.
    };
}