import {AnimationIds} from "@/meta/Animations";
import X, {AnyBinConstructor, Bin, ConstantBinConstructor} from "stramp";

const Animations = {
    [AnimationIds.DEATH]: X.null,
    [AnimationIds.HURT]: X.null
} as const;

export const EntityAnimationStruct = new AnyBinConstructor(Object.keys(Animations).map(i => X.object.struct(<{
    id: ConstantBinConstructor<AnimationIds>,
    data: Bin<typeof Animations[AnimationIds]>
}>{
    id: X.constant.new(Number(i)),
    data: Animations[i]
})));