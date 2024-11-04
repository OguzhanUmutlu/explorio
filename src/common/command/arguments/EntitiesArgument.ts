import {CommandArgument} from "../CommandArgument";
import {SelectorToken} from "../CommandProcessor";
import {Entity} from "../../entity/Entity";
import {CommandError} from "../Command.js";

export class EntitiesArgument<T = Entity[]> extends CommandArgument<T> {
    default = <T>[];
    filter = null;

    setFilter(filter: (entity: Entity) => boolean) {
        this.filter = filter;
        return this;
    };

    read(as, at, args, index) {
        const arg = <SelectorToken>args[index];

        const entities = as.server.executeSelector(as, at, arg);

        const filtered = this.filter ? entities.filter(this.filter) : entities;

        if (filtered.length === 0) throw new CommandError("No entities found.");

        return <T>filtered;
    };

    blindCheck(args, index) {
        return {pass: args[index] instanceof SelectorToken, index: index + 1};
    };

    toString() {
        return "selector";
    };
}