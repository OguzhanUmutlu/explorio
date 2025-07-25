import {TileIds} from "@/meta/Tiles";
import ContainerTile from "@/tile/defaults/ContainerTile";
import TileStruct from "@/structs/tile/TileStruct";
import X from "stramp";
import {InventoryContentStruct} from "@/structs/item/ItemStruct";
import {InventorySizes} from "@/meta/Inventories";

export default class ChestTile extends ContainerTile {
    typeId = TileIds.CHEST;
    typeName = "chest";
    name = "Chest";
    saveStruct = TileStruct.extend({
        items: X.array.typed(InventoryContentStruct).sized(InventorySizes.chest)
    });

    serverUpdate(_dt: number) {
    };
}