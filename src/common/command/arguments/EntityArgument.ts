import {CommandAs} from "@/command/CommandSender";
import Position from "@/utils/Position";
import {AnyToken} from "@/command/CommandProcessor";
import CommandArgument from "@/command/CommandArgument";
import EntitiesArgument from "@/command/arguments/EntitiesArgument";
import Entity from "@/entity/Entity";

export default class EntityArgument<T extends Entity = Entity> extends CommandArgument<T> {
    default = <T>null;
    base = new EntitiesArgument("").setMax(1).setMin(1);

    setFilterError(message: string | null) {
        this.base.setFilterError(message);
        return this;
    };

    setFilter<S extends T>(filter: (entity: T) => entity is S) {
        this.base.filter = filter;
        return <EntityArgument<S>><unknown>this;
    };

    getDefault() {
        if (!this.default) throw new Error(`No default value set for the '${this.name}' argument.`);

        return this.default;
    };

    read(as: CommandAs, at: Position, args: AnyToken[], index: number) {
        const r = this.base.read(as, at, args, index);
        return <T>r[0];
    };

    blindCheck(args: AnyToken[], index: number) {
        return this.base.blindCheck(args, index);
    };

    toString() {
        return "entity";
    };
}