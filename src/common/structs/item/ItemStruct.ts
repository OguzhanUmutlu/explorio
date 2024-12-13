import X from "stramp";
import {I, ItemMetaMax} from "@/meta/ItemIds";
import Item from "@/item/Item";
import {ItemNBTStruct} from "@/structs/item/ItemNBTStruct";

export const ItemIdBin = X.getNumberTypeOf(I.__MAX__);
export const ItemMetaBin = X.getNumberTypeOf(ItemMetaMax);

const ItemStruct = X.object.struct({
    id: ItemIdBin,
    meta: ItemMetaBin,
    count: X.u8,
    nbt: ItemNBTStruct
}).withConstructor(({id, meta, count, nbt}) => new Item(id, meta, count, nbt));

export default ItemStruct;

export const InventoryContentStruct = ItemStruct.or(X.null);