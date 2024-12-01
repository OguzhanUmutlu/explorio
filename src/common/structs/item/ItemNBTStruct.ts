import X from "stramp";

export type ItemNBT = Partial<typeof ItemNBTStruct["__TYPE__"]>;

export const ItemNBTStruct = X.object.struct({
    damage: X.u16.or(X.undefined)
});