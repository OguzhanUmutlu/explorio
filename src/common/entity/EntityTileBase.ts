import World from "@/world/World";
import {getServer} from "@/utils/Utils";
import Position from "@/utils/Position";
import {Bin, ObjectStructBin} from "stramp";

let _entity_id = 0;

export default abstract class EntityTileBase<Save extends Record<string, Bin> = Record<string, Bin>> extends Position {
    abstract typeId: number;
    abstract typeName: string; // used in selectors' type= attribute
    abstract name: string; // used for chat messages and informational purposes
    abstract saveStruct: ObjectStructBin<Save>;
    abstract init(): boolean;
    abstract update(dt: number): void;
    abstract serverUpdate(dt: number): void;
    abstract despawn(): void;
    abstract getSaveBuffer(): Buffer;

    isClient = false;
    id = _entity_id++;
    despawned = false;

    server = getServer();

    constructor() {
        super(0, 0, 0, null);
    };

    get data() {
        return this.saveStruct.adapt(this);
    };

    toString() {
        return this.name;
    };

    static spawn(world: World) {
        // @ts-expect-error Hello, there, you don't get to throw an error.
        const entity = <this>new (this);
        entity.world = world;
        entity.init();
        return entity;
    };
}