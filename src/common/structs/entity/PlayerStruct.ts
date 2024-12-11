import X from "stramp";
import WorldStruct from "@/structs/world/WorldStruct";
import EntityStruct from "@/structs/entity/EntityStruct";
import {InventoryName, InventorySizes} from "@/meta/Inventories";
import InventoryStruct from "@/structs/item/InventoryStruct";
import {GameModeStruct} from "@/command/arguments/GameModeArgument";

const invStructRecord = <Record<InventoryName, InventoryStruct>>{};
for (const k in InventorySizes) invStructRecord[k] = new InventoryStruct(InventorySizes[k], k);

export default EntityStruct.extend({
    world: WorldStruct, // This is sufficient because player files aren't located inside world folders
    permissions: X.set.typed(X.string16),
    handIndex: X.u8,
    gamemode: GameModeStruct,
    inventories: X.object.struct(invStructRecord)
});