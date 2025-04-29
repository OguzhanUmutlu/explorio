import X from "stramp";
import {ItemIds, ItemMetaMax} from "@/meta/ItemIds";
import Item from "@/item/Item";
import {ItemComponentsStruct} from "@/structs/item/ItemComponentsStruct";

export const ItemIdBin = X.getNumberTypeOf(ItemIds.__MAX__);
export const ItemMetaBin = X.getNumberTypeOf(ItemMetaMax);

const ItemStruct = X.object.struct({
    id: ItemIdBin,
    meta: ItemMetaBin,
    count: X.u8,
    components: ItemComponentsStruct
}).withConstructor(({id, meta, count, components}) => new Item(id, meta, count, components));

export default ItemStruct;

export const InventoryContentStruct = ItemStruct.or(X.null);