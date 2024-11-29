import X from "stramp";

export const EntityAttributesStruct = X.object.struct({
    walkSpeed: X.f32,
    flySpeed: X.f32,
    jumpVelocity: X.f32,
    health: X.f32,
    maxHealth: X.f32,
    gravity: X.f32,
    canPhase: X.bool,
    immobile: X.bool
});

export default X.object.struct({
    x: X.f32,
    y: X.f32,
    tags: X.set.typed(X.string16)
}).extend(EntityAttributesStruct);