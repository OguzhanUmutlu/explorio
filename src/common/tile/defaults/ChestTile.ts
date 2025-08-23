import {TileIds} from "@/meta/Tiles";
import {ContainerTile} from "@/tile/defaults/ContainerTile";
import {def} from "stramp";
import {InventoryContentStruct} from "@/structs/ItemStructs";
import {InventorySizes} from "@/meta/Inventories";
import {Item} from "@/item/Item";

export class ChestTile extends ContainerTile {
    typeId = TileIds.CHEST;
    typeName = "chest";
    name = "Chest";

    @def(InventoryContentStruct.array(InventorySizes.chest)) items: (Item | null)[];

    serverUpdate(_dt: number) {
    };
}