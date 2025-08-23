import X from "stramp";

export enum Containers {
    Closed,
    PlayerInventory,
    Chest,
    DoubleChest,
    CraftingTable,
    Furnace
}

export const ContainerIDBin = X.any.ofValues(...<Containers[]>Object.values(Containers));

export type InventoryName = keyof typeof InventorySizes;

export const CraftingMap = <Record<InventoryName, InventoryName>>{
    "craftingSmall": "craftingSmallResult",
    "craftingBig": "craftingBigResult"
};

export const CraftingResultMap = <Record<InventoryName, InventoryName>>{
    "craftingSmallResult": "craftingSmall",
    "craftingBigResult": "craftingBig"
};

export const InventorySizes = {
    hotbar: 9,
    offhand: 1,
    player: 27,
    armor: 4,
    cursor: 1,
    chest: 27,
    doubleChest: 54,
    craftingSmall: 4,
    craftingSmallResult: 1,
    craftingBig: 9,
    craftingBigResult: 1,
    furnaceInput: 1,
    furnaceFuel: 1,
    furnaceResult: 1,
    furnace: 3
} as const;