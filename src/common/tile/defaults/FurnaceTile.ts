import {TileIds} from "@/meta/Tiles";
import ContainerTile from "@/tile/defaults/ContainerTile";
import {registerAny} from "@/utils/Inits";
import TileStruct from "@/structs/tile/TileStruct";
import {InventoryContentStruct} from "@/structs/item/ItemStruct";
import X from "stramp";

export default class FurnaceTile extends ContainerTile {
    static _ = registerAny(this);
    typeId = TileIds.FURNACE;
    typeName = "furnace";
    name = "Furnace";
    saveStruct = TileStruct.extend({
        input: InventoryContentStruct,
        fuel: InventoryContentStruct,
        result: InventoryContentStruct,
        xp: X.u32,
        time: X.f32
    });

    serverUpdate(dt: number) {
    };
}