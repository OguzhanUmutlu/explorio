import X from "stramp";

export default X.object.struct({
    x: X.f32,
    y: X.f32,
    tags: X.set.typed(X.string16)
});