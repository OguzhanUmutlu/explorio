import X, {Bin} from "stramp";
import {Inventory} from "@/item/Inventory";
import {Item} from "@/item/Item";
import {ItemFactory} from "@/item/ItemFactory";
import {InventoryName, InventorySizes} from "@/meta/Inventories";

export enum ItemPublicity {
    PUBLIC, PROTECTED, PRIVATE
}

function getItemStruct(publicity: ItemPublicity) {
    switch (publicity) {
        case ItemPublicity.PUBLIC:
            return PublicItemStruct;
        case ItemPublicity.PROTECTED:
            return ProtectedItemStruct;
        case ItemPublicity.PRIVATE:
            return PrivateItemStruct;
        default:
            throw new Error("Invalid ItemPublicity");
    }
}

export function InventoryStruct(publicity: ItemPublicity, size: number, name: string) {
    return getItemStruct(publicity).nullable().array(size).highway<Inventory>(
        inv => inv.getContents(),
        obj => new Inventory(size, name).setContents(obj),
        null
    );
}

// everyone can see and know
export const PublicComponentsStruct = X.object.struct({
    glint: X.boolean
});

// only the owner of the item, like the player, can know
export const ProtectedComponentsStruct = X.object.struct({
    damage: X.u16.default(0),
    enchantments: X.object.struct({
        id: X.u16,
        level: X.u8
    }).array().default([]),
    displayName: X.string8.nullable(),
    description: X.string8.array().nullable()
});

// is not sent over network, only stored in db
export const PrivateComponentsStruct = X.object.struct({
    customData: X.object.nullable()
}).extend(ProtectedComponentsStruct);

export type ItemComponents = typeof PrivateComponentsStruct["__TYPE__"];

const PrivateItemBaseStruct = X.object.struct({
    identifier: X.cstring,
    count: X.u8,
    components: PrivateComponentsStruct
});

const ProtectedItemBaseStruct = X.object.struct({
    identifier: X.cstring,
    count: X.u8,
    components: ProtectedComponentsStruct
});

const PublicItemBaseStruct = X.object.struct({
    identifier: X.cstring,
    count: X.u8,
    components: PublicComponentsStruct
});

function HighwayItem(struct: Bin<{ identifier: string, count: number, components: Record<string, unknown> }>) {
    return struct.highway<Item>(
        (item: Item) => {
            if (!(item instanceof Item)) throw struct.makeProblem("Expected an Item instance");
            return {
                identifier: item.identifier,
                count: item.count,
                components: item.components as never
            };
        },
        (data: typeof PrivateItemBaseStruct["__TYPE__"]) => {
            const itemData = ItemFactory.name2data[data.identifier];
            if (!itemData) return null;
            return new Item(itemData.id, itemData.meta, data.count, data.components);
        },
        null
    );
}

export const PrivateItemStruct = HighwayItem(PrivateItemBaseStruct);
export const ProtectedItemStruct = HighwayItem(ProtectedItemBaseStruct);
export const PublicItemStruct = HighwayItem(PublicItemBaseStruct);

export const InventoryNameBin = X.any.ofValues(...<InventoryName[]>Object.keys(InventorySizes));
