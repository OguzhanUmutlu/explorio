import X from "stramp";
import Inventory from "@/item/Inventory";
import Item from "@/item/Item";
import ItemFactory from "@/item/ItemFactory";
import {InventoryName, InventorySizes} from "@/meta/Inventories";

export function InventoryStruct(size: number, name: string) {
    return InventoryContentStruct.array(size).highway<Inventory>(
        inv => inv.getContents(),
        obj => new Inventory(size, name).setContents(obj),
        null
    );
}

export type ItemComponents = typeof ItemComponentsStruct["__TYPE__"];

export const ItemComponentsStruct = X.object.struct({
    damage: X.u16
});

const ItemBaseStruct = X.object.struct({
    identifier: X.cstring,
    count: X.u8,
    components: ItemComponentsStruct
});

export const ItemStruct = ItemBaseStruct.highway<Item>(
    item => {
        if (!(item instanceof Item)) throw ItemBaseStruct.makeProblem("Expected an Item instance");
        return {
            identifier: item.identifier,
            count: item.count,
            components: item.components
        };
    },
    data => {
        const itemData = ItemFactory.name2data[data.identifier];
        if (!itemData) return null;
        return new Item(itemData.id, itemData.meta, data.count, data.components);
    },
    null
);

export const InventoryContentStruct = ItemStruct.nullable();

export const InventoryNameBin = X.any.ofValues(...<InventoryName[]>Object.keys(InventorySizes));
