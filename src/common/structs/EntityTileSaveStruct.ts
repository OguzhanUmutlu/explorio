import X, {Bin, BufferIndex, IntBaseBin} from "stramp";
import {Tile} from "@/tile/Tile";
import {TileIds} from "@/meta/Tiles";
import {Server} from "@/Server";
import {Entity} from "@/entity/Entity";
import {EntityIds} from "@/meta/Entities";

export class EntityTileSaveStruct<T extends Tile | Entity> extends Bin<T> {
    server: Server;

    typeIdBin: IntBaseBin;

    constructor(public isEntity: boolean, public name = isEntity ? "Entity" : "Tile") {
        super();
        this.typeIdBin = X.getUnsignedTypeOf(isEntity ? EntityIds.length : TileIds.length);
    };

    unsafeWrite(bind: BufferIndex, te: T) {
        this.typeIdBin.unsafeWrite(bind, te.typeId);
        te.saveTo(bind);
    };

    read(bind: BufferIndex): T {
        const typeId = this.typeIdBin.read(bind);
        const te = new ((this.isEntity ? this.server.registeredEntities : this.server.registeredTiles)[typeId])();
        te.loadFrom(bind);
        return <T>te;
    };

    unsafeSize(value: T): number {
        return this.typeIdBin.bytes + value.saveStruct.getSize(value);
    };

    findProblem(value: T) {
        if (!(value instanceof (this.isEntity ? Entity : Tile))) {
            return this.makeProblem(`Expected a${this.isEntity ? "n" : ""} ${this.name}`);
        }
    };

    get sample() {
        return null;
    };
}

export const EntitySaveStruct = new EntityTileSaveStruct<Entity>(true, "Entity");
export const TileSaveStruct = new EntityTileSaveStruct<Tile>(false, "Tile");
