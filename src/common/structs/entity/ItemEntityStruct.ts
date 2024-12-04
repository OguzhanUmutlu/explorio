import EntityStruct from "@/structs/entity/EntityStruct";
import ItemStruct from "@/structs/item/ItemStruct";
import X from "stramp";

export default EntityStruct.extend({
    item: ItemStruct,
    delay: X.f32,
    despawnTimer: X.f32
});