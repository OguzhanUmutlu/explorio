import {Entity} from "../../entity/Entity";
import {EntitiesArgument} from "./EntitiesArgument";
import {CommandAs} from "../CommandSender";
import {Location} from "../../utils/Location";
import {AnyToken} from "../CommandProcessor";

export class EntityArgument<T extends Entity = Entity> extends EntitiesArgument<T> {
    default = <T>null;

    getDefault() {
        if (!this.default) throw new Error(`No default value set for the '${this.name}' argument.`);
        return this.default;
    };

    read(as: CommandAs, at: Location, args: AnyToken[], index: number) {
        return super.read(as, at, args, index)[0];
    };

    toString() {
        return "entity";
    };
}