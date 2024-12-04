import CommandArgument from "@/command/CommandArgument";
import {AnyToken} from "@/command/CommandProcessor";
import SelectorToken from "@/command/token/SelectorToken";
import Entity from "@/entity/Entity";
import CommandError from "@/command/CommandError";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";

export default class EntitiesArgument<T extends Entity[] = Entity[]> extends CommandArgument<T> {
    default = <T>[];
    filterError = null;
    filter = null;
    limit = Infinity;
    strictLimit = false;

    setFilterError(message: string | null) {
        this.filterError = message;
        return this;
    };

    setFilter<S extends T[number]>(filter: (entity: T[number]) => entity is S) {
        this.filter = filter;
        return <EntitiesArgument<S[]>><unknown>this;
    };

    setLimit(limit: number) {
        this.limit = limit;
        return this;
    };

    setLimitStrict(strictLimit: boolean) {
        this.strictLimit = strictLimit;
        return this;
    };

    read(as: CommandAs, at: Location, args: AnyToken[], index: number) {
        const arg = <SelectorToken>args[index];

        const entities = as.server.executeSelector(as, at, arg);

        const filtered = this.filter ? entities.filter(this.filter) : entities;

        if (filtered.length !== entities.length && this.filterError) throw new CommandError(this.filterError);

        if (filtered.length === 0) throw new CommandError("No entities found.");

        if (this.strictLimit && filtered.length !== this.limit) throw new CommandError("Expected to find exactly " + this.limit + " entities.");

        if (filtered.length > this.limit) throw new CommandError("Expected to find at most " + this.limit + " entities.");

        return <T>filtered.slice(0, this.limit);
    };

    blindCheck(args: AnyToken[], index: number) {
        return {pass: args[index] instanceof SelectorToken, index: index + 1};
    };

    toString() {
        return "selector";
    };
}