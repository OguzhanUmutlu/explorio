import X, {Bin, BufferIndex, IntBaseBin} from "stramp";
import Tile from "@/tile/Tile";
import {TileIds} from "@/meta/Tiles";
import {getServer} from "@/utils/Utils";

export default new class TileSaveStruct extends Bin<Tile> {
    isOptional = false as const;
    name = "Tile";
    typeIdBin: IntBaseBin;

    constructor() {
        super();
        this.typeIdBin = <IntBaseBin>X.getNumberTypeOf(TileIds.__MAX__);
    };

    unsafeWrite(bind: BufferIndex, tile: Tile) {
        this.typeIdBin.unsafeWrite(bind, tile.typeId);
        tile.saveStruct.unsafeWrite(bind, tile);
    };

    read(bind: BufferIndex): Tile {
        const typeId = this.typeIdBin.read(bind);
        const tile = new (getServer().registeredTiles[typeId])();
        const obj = tile.saveStruct.read(bind);

        for (const k in obj) {
            tile[k] = obj[k];
        }

        return tile;
    };

    unsafeSize(value: Tile): number {
        return this.typeIdBin.bytes + value.saveStruct.unsafeSize(value);
    };

    findProblem(value: Tile, strict = false) {
        if (!(value instanceof Tile)) return this.makeProblem("Expected a tile");
        return value.saveStruct.findProblem(value, strict);
    };

    get sample() {
        return null;
    };
}