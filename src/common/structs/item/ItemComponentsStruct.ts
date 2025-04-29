import X from "stramp";

export type ItemComponents = Partial<typeof ItemComponentsStruct["__TYPE__"]>;

export const ItemComponentsStruct = X.object.struct({
    damage: X.u16.or(X.undefined)
});