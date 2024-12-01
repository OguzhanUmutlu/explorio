export enum Containers {
    Closed,
    PlayerInventory,
    Chest,
    DoubleChest,
    CraftingTable
}

export const Inventories = {
    Hotbar: "hotbar",
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