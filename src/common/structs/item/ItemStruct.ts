import X from "stramp";
import {ItemIds} from "@/meta/ItemIds";
import Item from "@/item/Item";
import {ItemNBTStruct} from "@/structs/item/ItemNBTStruct";

export default X.object.struct({
    id: X.getNumberTypeOf(ItemIds.__MAX__),
    meta: X.u8,
    count: X.u8,
    nbt: ItemNBTStruct
}).withConstructor(({id, meta, count, nbt}) => new Item(id, meta, count, nbt));