export enum Containers {
    Closed,
    PlayerInventory,
    Chest,
    DoubleChest,
    CraftingTable
}

export type InventoryName = typeof Inventories[keyof typeof Inventories];

export const CraftingResultInventoryNames: ReadonlyArray<InventoryName> = ["craftingSmallResult", "craftingBigResult"];
export const CraftingInventoryNames: ReadonlyArray<InventoryName> = ["craftingSmall", "craftingBig"];
export const CraftingMap = <Record<InventoryName, InventoryName>>{
    "craftingSmall": "craftingSmallResult",
    "craftingBig": "craftingBigResult"
};
export const CraftingMapFromResult = <Record<InventoryName, InventoryName>>{
    "craftingSmallResult": "craftingSmall",
    "craftingBigResult": "craftingBig"
};

export const Inventories = {
    Hotbar: "hotbar",
    Offhand: "offhand",
    Player: "player",
    Armor: "armor",
    Cursor: "cursor",
    Chest: "chest",
    DoubleChest: "doubleChest",
    CraftingSmall: "craftingSmall",
    CraftingSmallResult: "craftingSmallResult",
    CraftingBig: "craftingBig",
    CraftingBigResult: "craftingBigResult"
} as const;

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
    craftingBigResult: 1
} as const;