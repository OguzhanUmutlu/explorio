import X, {Bin, BufferIndex, IntBaseBin} from "stramp";
import {EntityIds, EntityClasses} from "@/meta/Entities";
import Entity from "@/entity/Entity";


export default new class EntitySaveStruct extends Bin<Entity> {
    name = "Entity";
    typeIdBin: IntBaseBin;

    constructor() {
        super();
        this.typeIdBin = <IntBaseBin>X.getNumberTypeOf(EntityIds.__MAX__);
    };

    unsafeWrite(bind: BufferIndex, entity: Entity) {
        this.typeIdBin.unsafeWrite(bind, entity.typeId);
        const struct = entity.saveStruct;
        struct.unsafeWrite(bind, entity);
    };

    read(bind: BufferIndex): Entity {
        const typeId = this.typeIdBin.read(bind);
        const entity = new (EntityClasses[typeId])();
        const obj = entity.saveStruct.read(bind, entity);

        for (const k in obj) {
            entity[k] = obj[k];
        }

        return entity;
    };

    unsafeSize(value: Entity): number {
        return this.typeIdBin.bytes + value.saveStruct.unsafeSize(value);
    };

    findProblem(value: Entity, strict = false) {
        if (!(value instanceof Entity)) return this.makeProblem("Expected an entity");
        return value.saveStruct.findProblem(value, strict);
    };

    get sample() {
        return null;
    };
}