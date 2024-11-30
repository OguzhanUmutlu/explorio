import CommandArgument from "$/command/CommandArgument";
import {AnyToken} from "$/command/CommandProcessor";
import SelectorToken from "$/command/token/SelectorToken";
import Entity from "$/entity/Entity";
import CommandError from "$/command/CommandError";
import {CommandAs} from "$/command/CommandSender";
import Location from "$/utils/Location";

export default class EntitiesArgument<T = Entity[]> extends CommandArgument<T> {
    default = <T>[];
    filter = null;

    setFilter(filter: (entity: Entity) => boolean) {
        this.filter = filter;
        return this;
    };

    read(as: CommandAs, at: Location, args: AnyToken[], index: number) {
        const arg = <SelectorToken>args[index];

        const entities = as.server.executeSelector(as, at, arg);

        const filtered = this.filter ? entities.filter(this.filter) : entities;

        if (filtered.length === 0) throw new CommandError("No entities found.");

        return <T>filtered;
    };

    blindCheck(args: AnyToken[], index: number) {
        return {pass: args[index] instanceof SelectorToken, index: index + 1};
    };

    toString() {
        return "selector";
    };
}