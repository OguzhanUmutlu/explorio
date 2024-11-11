import X, {Bin} from "stramp";

export enum Containers {
    Closed,
    PlayerInventory,
    Chest,
    DoubleChest,
    CraftingTable
}

export enum Inventories {
    Hotbar = "hotbar",
    Player = "playerInventory",
    Armor = "armor",
    Cursor = "cursor",
    Chest = "chest",
    DoubleChest = "doubleChest",
    CraftingSmall = "craftingSmall",
    CraftingSmallResult = "craftingSmallResult",
    CraftingBig = "craftingBig",
    CraftingBigResult = "craftingBigResult"
}

export const ContainerNameBin = <Bin<Inventories>>X.any.of(Object.values(Inventories).map(X.makeLiteral));