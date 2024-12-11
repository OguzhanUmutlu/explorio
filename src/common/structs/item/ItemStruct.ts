import X from "stramp";
import {I} from "@/meta/ItemIds";
import Item from "@/item/Item";
import {ItemNBTStruct} from "@/structs/item/ItemNBTStruct";

const ItemStruct = X.object.struct({
    id: X.getNumberTypeOf(I.__MAX__),
    meta: X.u8,
    count: X.u8,
    nbt: ItemNBTStruct
}).withConstructor(({id, meta, count, nbt}) => new Item(id, meta, count, nbt));

export default ItemStruct;

export const InventoryContentStruct = ItemStruct.or(X.null);