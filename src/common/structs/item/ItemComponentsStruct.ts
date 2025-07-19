import X from "stramp";

export type ItemComponents = typeof ItemComponentsStruct["__TYPE__"];

export const ItemComponentsStruct = X.object.struct({
    damage: X.u16
});