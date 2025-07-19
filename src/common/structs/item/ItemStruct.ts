import X, {Bin, BufferIndex} from "stramp";
import Item from "@/item/Item";
import {ItemComponentsStruct} from "@/structs/item/ItemComponentsStruct";
import ItemFactory from "@/item/ItemFactory";

const BaseItemStruct = X.object.struct({
    identifier: X.cstring,
    count: X.u8,
    components: ItemComponentsStruct
});

class ItemStructConstructor extends Bin<Item> {
    isOptional = false as const;
    name = "Item";

    unsafeWrite(bind: BufferIndex, value: Item): void {
        BaseItemStruct.unsafeWrite(bind, {
            identifier: value.toMetadata().identifier,
            count: value.count,
            components: value.components
        });
    };

    read(bind: BufferIndex) {
        const data = BaseItemStruct.read(bind);
        const itemData = ItemFactory.name2data[data.identifier];
        if (!itemData) return null;
        return new Item(itemData.id, itemData.meta, data.count, data.components);
    };

    unsafeSize(value: Item): number {
        return BaseItemStruct.unsafeSize({
            identifier: value.toMetadata().identifier,
            count: value.count,
            components: value.components
        });
    };

    findProblem(value: Item, _strict = false) {
        if (!value) return this.makeProblem("Item is null");
        const data = value.toMetadata();
        if (!data) return this.makeProblem("Item metadata not found");
        if (data.identifier !== value.toMetadata().identifier) return this.makeProblem("Item identifier mismatch");
        if (value.count < 1 || value.count > data.maxStack) return this.makeProblem("Item count out of bounds");
        return null;
    };

    get sample() {
        return null;
    };
}

const ItemStruct = new ItemStructConstructor();

export default ItemStruct;

export const InventoryContentStruct = X.any.of(ItemStruct, X.null);