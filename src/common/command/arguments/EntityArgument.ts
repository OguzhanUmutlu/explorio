import {Entity} from "../../entity/Entity";
import {EntitiesArgument} from "./EntitiesArgument.js";

export class EntityArgument<T = Entity> extends EntitiesArgument<Entity> {
    default = <T>null;

    getDefault() {
        if (!this.default) throw new Error(`No default value set for the '${this.name}' argument.`);
        return this.default;
    };

    read(as, at, args, index) {
        return super.read(as, at, args, index)[0];
    };

    toString() {
        return "entity";
    };
}