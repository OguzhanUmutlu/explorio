import X from "stramp";
import {Inventories, InventorySizes} from "../../meta/Inventories";
import EntityStruct from "../EntityStruct";
import InventoryStruct from "../InventoryStruct";
import WorldStruct from "../WorldStruct";

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
    xp: X.u32,
    blockReach: X.f32,
    attackReach: X.f32,
    isFlying: X.bool,
    canToggleFly: X.bool,
    food: X.f32,
    maxFood: X.f32,
    placeCooldown: X.f32,
    instantBreak: X.bool
});