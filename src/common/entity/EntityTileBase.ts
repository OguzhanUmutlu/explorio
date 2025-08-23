import {World} from "@/world/World";
import {Position} from "@/utils/Position";
import X, {BufferIndex} from "stramp";

let _entity_id = 0;

export abstract class EntityTileBase extends Position {
    abstract typeId: number;
    abstract typeName: string; // used in selectors' type= attribute
    abstract name: string; // used for chat messages and informational purposes
    abstract init(): boolean;
    abstract update(dt: number): void;
    abstract serverUpdate(dt: number): void;
    abstract despawn(): void;
    abstract getSaveBuffer(): Buffer;

    isClient = false;
    id = _entity_id++;
    despawned = false;

    constructor() {
        super(0, 0, 0, null);
    };

    get rawData() {
        return this.saveStruct.adapt(null);
    };

    get saveStruct() {
        return X.getStruct(this);
    };

    saveTo(bind: BufferIndex) {
        this.saveStruct.serialize(this, bind);
    };

    loadFrom(bind: BufferIndex) {
        this.saveStruct.parse(bind, this);
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