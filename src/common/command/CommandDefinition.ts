import {CommandArgument} from "./CommandArgument";
import {NumberArgument} from "./arguments/NumberArgument";
import {GameModeArgument} from "./arguments/GameModeArgument";
import {PositionArgument} from "./arguments/PositionArgument";
import {EntitiesArgument} from "./arguments/EntitiesArgument";
import {TextArgument} from "./arguments/TextArgument";
import {BoolArgument} from "./arguments/BoolArgument";
import {ObjectArgument} from "./arguments/ObjectArgument";
import {ArrayArgument} from "./arguments/ArrayArgument";
import {CommandAs, CommandSender} from "./CommandSender";
import {Location} from "../utils/Location";
import {EntityArgument} from "./arguments/EntityArgument";
import {LabelArgument} from "./arguments/LabelArgument.js";

export type Append<T, V> = T extends [] ? [V] : [...T, V];

export type CommandDefinitionType = CommandDefinition<CommandArgument[]>;

export class CommandDefinition<T extends CommandArgument[] = []> {
    permission: string | false = false;
    arguments: CommandArgument[] = <any>[];
    run: (sender: CommandSender, as: CommandAs | null, at: Location, ...args: { [K in keyof T]: T[K]["__TYPE__"] }) => any | void;

    addArgumentViaClass<V extends CommandArgument>(clazz: new (name: string) => V, name: string, fn?: (n: V) => any): CommandDefinition<Append<T, V>> {
        const arg = new clazz(name);
        if (fn) fn(arg);
        this.arguments.push(arg);
        return <any>this;
    };

    addNumberArgument<M extends NumberArgument>(name: string, fn?: (n: M) => any): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(NumberArgument, name, fn);
    };

    addGameModeArgument<M extends GameModeArgument>(name: string, fn?: (n: M) => any): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(NumberArgument, name, fn);
    };

    addPositionArgument<M extends PositionArgument>(name: string, fn?: (n: M) => any): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(PositionArgument, name, fn);
    };

    addEntitiesArgument<M extends EntitiesArgument>(name: string, fn?: (n: M) => any): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(EntitiesArgument, name, fn);
    };

    addEntityArgument<M extends EntityArgument>(name: string, fn?: (n: M) => any): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(EntityArgument, name, fn);
    };

    addTextArgument<M extends TextArgument>(name: string, fn?: (n: M) => any): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(TextArgument, name, fn);
    };

    addBoolArgument<M extends BoolArgument>(name: string, fn?: (n: M) => any): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(BoolArgument, name, fn);
    };

    addObjectArgument<M extends ObjectArgument>(name: string, fn?: (n: M) => any): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(ObjectArgument, name, fn);
    };

    addArrayArgument<M extends ArrayArgument>(name: string, fn?: (n: M) => any): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(ArrayArgument, name, fn);
    };

    addLabelArgument<M extends LabelArgument>(name: string, fn?: (n: M) => any) {
        return <CommandDefinition<T>>this.addArgumentViaClass(LabelArgument, name, fn);
    };

    setPermission(permission: string | false) {
        this.permission = permission;
        return this;
    };

    then(fn: this["run"]) {
        this.run = fn;
        return this;
    };

    toString() {
        return this.arguments.map(arg => arg.toUsageString()).join(" ");
    };
}