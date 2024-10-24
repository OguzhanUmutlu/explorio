import {CommandArgument} from "./CommandArgument";
import {NumberArgument} from "./arguments/NumberArgument";
import {GameModeArgument} from "./arguments/GameModeArgument";
import {PositionArgument} from "./arguments/PositionArgument";
import {SelectorArgument} from "./arguments/SelectorArgument";
import {TextArgument} from "./arguments/TextArgument";
import {BoolArgument} from "./arguments/BoolArgument";
import {ObjectArgument} from "./arguments/ObjectArgument";
import {ArrayArgument} from "./arguments/ArrayArgument";
import {CommandSender} from "./CommandSender";
import {RotatedPosition} from "../utils/RotatedPosition";
import {EntityArgument} from "./arguments/EntityArgument";
import {CommandError, CommandSuccess} from "./Command";

export type Append<T, V> = T extends [] ? [V] : [...T, V];

export class CommandDefinition<T extends CommandArgument[] = []> {
    permission: string | false = false;
    arguments: CommandArgument<any>[] = <any>[];
    run: (source: CommandSender, as: CommandSender, at: RotatedPosition, ...args: { [K in keyof T]: T[K]["__TYPE__"] }) => CommandSuccess | string | void;

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

    addSelectorArgument<M extends SelectorArgument>(name: string, fn?: (n: M) => any): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(SelectorArgument, name, fn);
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

    setPermission(permission: string | false) {
        this.permission = permission;
        return this;
    };

    then(fn: this["run"]) {
        this.run = fn;
        return this;
    };

    execute(source: CommandSender, as: CommandSender, at: RotatedPosition, args: T) {
        let response: any;
        try {
            response = <any>this.run(source, as, at, ...args);
            if (response instanceof CommandSuccess) response = response.message;
            if (typeof response === "string") source.sendMessage(`§a${response}`);
        } catch (e) {
            if (e instanceof CommandError) {
                source.sendMessage(`§c${e.message}`);
            } else {
                source.sendMessage("§cAn unexpected error occurred.");
                printer.error(e);
            }
        }
    };

    toString() {
        return this.arguments.map(i => {
            return `${i.required ? "<" : "["}${i.spread ? "..." : ""}${i.name}: ${i.toString()}${i.required ? ">" : "]"}`;
        }).join(" ");
    };
}