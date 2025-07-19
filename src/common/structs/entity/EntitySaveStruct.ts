import X, {Bin, BufferIndex} from "stramp";
import Entity from "@/entity/Entity";
import {getServer} from "@/utils/Utils";

export default new class EntitySaveStruct extends Bin<Entity> {
    isOptional = false as const;
    name = "Entity";
    typeIdBin = X.u16; // Should be enough.

    unsafeWrite(bind: BufferIndex, entity: Entity) {
        this.typeIdBin.unsafeWrite(bind, entity.typeId);
        const struct = entity.saveStruct;
        struct.unsafeWrite(bind, entity);
    };

    read(bind: BufferIndex): Entity {
        const typeId = this.typeIdBin.read(bind);
        const entity = new (getServer().registeredEntities[typeId])();
        const obj = entity.saveStruct.read(bind);

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