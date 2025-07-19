import X, {AnyBinConstructor, Bin, ConstantBinConstructor} from "stramp";
import {AnimationIds} from "@/meta/Animations";

const Animations = {
    [AnimationIds.DEATH]: X.null,
    [AnimationIds.HURT]: X.null
} as const;

export default new AnyBinConstructor(Object.keys(Animations).map(i => X.object.struct(<{
    id: ConstantBinConstructor<AnimationIds>,
    data: Bin<typeof Animations[AnimationIds]>
}>{
    id: X.constant.new(Number(i)),
    data: Animations[i]
})));