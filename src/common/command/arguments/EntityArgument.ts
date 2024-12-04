import Entity from "@/entity/Entity";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";
import {AnyToken} from "@/command/CommandProcessor";
import CommandArgument from "@/command/CommandArgument";
import EntitiesArgument from "@/command/arguments/EntitiesArgument";

export default class EntityArgument<T extends Entity = Entity> extends CommandArgument<T> {
    default = <T>null;
    base = new EntitiesArgument("").setLimit(1).setLimitStrict(true);

    setFilter<S extends T>(filter: (entity: T) => entity is S) {
        this.base.filter = filter;
        return <EntityArgument<S>><unknown>this;
    };

    getDefault() {
        if (!this.default) throw new Error(`No default value set for the '${this.name}' argument.`);

        return this.default;
    };

    read(as: CommandAs, at: Location, args: AnyToken[], index: number) {
        const r = this.base.read(as, at, args, index);
        return <T>r[0];
    };

    blindCheck(args: AnyToken[], index: number): { pass: boolean; index: number } {
        return this.base.blindCheck(args, index);
    };

    toString() {
        return "entity";
    };
}