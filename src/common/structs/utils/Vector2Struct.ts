import X from "stramp";
import Vector2 from "@/utils/Vector2";

export default X.object.struct({
    x: X.f64,
    y: X.f64
}).withConstructor(({x, y}) => new Vector2(x, y));