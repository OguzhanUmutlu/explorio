import {TileIds} from "@/meta/Tiles";
import ContainerTile from "@/tile/defaults/ContainerTile";
import {InventoryContentStruct} from "@/structs/ItemStructs";
import X, {def} from "stramp";
import {InventorySizes} from "@/meta/Inventories";
import Item from "@/item/Item";

export default class FurnaceTile extends ContainerTile {
    typeId = TileIds.FURNACE;
    typeName = "furnace";
    name = "Furnace";

    @def(InventoryContentStruct.array(InventorySizes.furnace)) items: (Item | null)[];
    @def(X.u32) xp = 0;
    @def(X.f32) time = 0;

    get input() {
        return this.items[0];
    };
    set input(v) {
        this.items[0] = v;
    };
    get fuel() {
        return this.items[1];
    };
    set fuel(v) {
        this.items[1] = v;
    };
    get result() {
        return this.items[2];
    };
    set result(v) {
        this.items[2] = v;
    };

    serverUpdate(_dt: number) {
    };
}