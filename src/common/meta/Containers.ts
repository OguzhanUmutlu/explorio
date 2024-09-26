import X, {Bin} from "stramp";

export enum Containers {
    CLOSED,
    PLAYER_INVENTORY
}

export enum Inventories {
    HOTBAR = "hotbar",
    INVENTORY = "inventory",
    ARMOR_INVENTORY = "armorInventory",
    CURSOR = "cursor",
    CHEST = "chest",
    DOUBLE_CHEST = "doubleChest",
    CRAFTING_2X2 = "crafting2x2",
    CRAFTING_3X3 = "crafting3x3"
}

export const InventoryNameBin = <Bin<Inventories>>X.any.of(Object.values(Inventories).map(X.makeLiteral));