import CommandArgument from "@/command/CommandArgument";
import {AnyToken} from "@/command/CommandProcessor";
import SelectorToken from "@/command/token/SelectorToken";
import Entity from "@/entity/Entity";
import CommandError from "@/command/CommandError";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";
import {UsernameRegex} from "@/utils/Utils";

export default class EntitiesArgument<T extends Entity[] = Entity[]> extends CommandArgument<T> {
    default = <T>[];
    filterError = null;
    filter = null;
    min = 0;
    max = Infinity;

    setFilterError(message: string | null) {
        this.filterError = message;
        return this;
    };

    setFilter<S extends T[number]>(filter: (entity: T[number]) => entity is S) {
        this.filter = filter;
        return <EntitiesArgument<S[]>><unknown>this;
    };

    setMin(min: number) {
        this.min = min;
        return this;
    };

    setMax(max: number) {
        this.max = max;
        return this;
    };

    read(as: CommandAs, at: Location, args: AnyToken[], index: number) {
        const arg = args[index];

        const entities = arg instanceof SelectorToken
            ? as.server.executeSelector(as, at, arg)
            : arg.rawText in as.server.players ? [as.server.players[arg.rawText]] : [];

        const filtered = this.filter ? entities.filter(this.filter) : entities;

        if (filtered.length !== entities.length && this.filterError) throw new CommandError(this.filterError);

        if (filtered.length === 0) throw new CommandError("No entities found.");

        if (filtered.length > this.max) throw new CommandError("Expected to find at most " + this.max + " entities.");
        if (filtered.length < this.min) throw new CommandError("Expected to find at least " + this.min + " entities.");

        return <T>filtered;
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];
        return {pass: arg && (arg instanceof SelectorToken || UsernameRegex.test(arg.rawText)), index: index + 1};
    };

    toString() {
        return "selector";
    };
}