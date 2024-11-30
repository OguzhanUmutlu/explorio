import X from "stramp";
import WorldStruct from "$/structs/world/WorldStruct";
import EntityStruct from "$/structs/entity/EntityStruct";
import {Inventories, InventorySizes} from "$/meta/Inventories";
import InventoryStruct from "$/structs/item/InventoryStruct";

export default EntityStruct.extend({
    world: WorldStruct, // This is required because player files aren't located inside world folders
    permissions: X.set.typed(X.string16),
    handIndex: X.u8,
    [Inventories.Hotbar]: new InventoryStruct(InventorySizes.hotbar),
    [Inventories.Player]: new InventoryStruct(InventorySizes.player),
    [Inventories.Armor]: new InventoryStruct(InventorySizes.armor),
    [Inventories.Cursor]: new InventoryStruct(InventorySizes.cursor),
    [Inventories.Chest]: new InventoryStruct(InventorySizes.chest),
    [Inventories.DoubleChest]: new InventoryStruct(InventorySizes.doubleChest),
    [Inventories.CraftingSmall]: new InventoryStruct(InventorySizes.craftingSmall),
    [Inventories.CraftingSmallResult]: new InventoryStruct(InventorySizes.craftingSmallResult),
    [Inventories.CraftingBig]: new InventoryStruct(InventorySizes.craftingBig),
    [Inventories.CraftingBigResult]: new InventoryStruct(InventorySizes.craftingBigResult),
});