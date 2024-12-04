import CommandArgument from "@/command/CommandArgument";
import NumberArgument from "@/command/arguments/NumberArgument";
import GameModeArgument from "@/command/arguments/GameModeArgument";
import PositionArgument from "@/command/arguments/PositionArgument";
import EntitiesArgument from "@/command/arguments/EntitiesArgument";
import TextArgument from "@/command/arguments/TextArgument";
import BoolArgument from "@/command/arguments/BoolArgument";
import ObjectArgument from "@/command/arguments/ObjectArgument";
import ArrayArgument from "@/command/arguments/ArrayArgument";
import CommandSender, {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";
import EntityArgument from "@/command/arguments/EntityArgument";
import LabelArgument from "@/command/arguments/LabelArgument";
import EffectArgument from "@/command/arguments/EffectArgument";

export type Append<T extends unknown[] | [], V> = T extends [] ? [V] : [...T, V];

export type CommandDefinitionType = CommandDefinition<CommandArgument[]>;

export default class CommandDefinition<T extends CommandArgument[] = []> {
    permission: string | false = false;
    arguments = <CommandArgument[]>[];
    run: (sender: CommandSender, as: CommandAs | null, at: Location, ...args: { [K in keyof T]: T[K]["__TYPE__"] }) => unknown;

    addArgumentViaClass<V extends CommandArgument>(clazz: new (name: string) => V, name: string, fn?: (n: V) => V) {
        const arg = new clazz(name);
        if (fn) fn(arg);
        this.arguments.push(arg);
        return <CommandDefinition<Append<T, V>>>this;
    };

    addNumberArgument<M extends NumberArgument>(name: string, fn?: (n: NumberArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(NumberArgument, name, fn);
    };

    addGameModeArgument<M extends GameModeArgument>(name: string, fn?: (n: GameModeArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(NumberArgument, name, fn);
    };

    addEffectArgument<M extends EffectArgument>(name: string, fn?: (n: EffectArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(EffectArgument, name, fn);
    };

    addPositionArgument<M extends PositionArgument>(name: string, fn?: (n: PositionArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(PositionArgument, name, fn);
    };

    addEntitiesArgument<M extends EntitiesArgument>(name: string, fn?: (n: EntitiesArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(EntitiesArgument, name, fn);
    };

    addEntityArgument<M extends EntityArgument>(name: string, fn?: (n: EntityArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(EntityArgument, name, fn);
    };

    addTextArgument<M extends TextArgument>(name: string, fn?: (n: TextArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(TextArgument, name, fn);
    };

    addBoolArgument<M extends BoolArgument>(name: string, fn?: (n: BoolArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(BoolArgument, name, fn);
    };

    addObjectArgument<M extends ObjectArgument>(name: string, fn?: (n: ObjectArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(ObjectArgument, name, fn);
    };

    addArrayArgument<M extends ArrayArgument>(name: string, fn?: (n: ArrayArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(ArrayArgument, name, fn);
    };

    addLabelArgument<M extends LabelArgument>(name: string, fn?: (n: LabelArgument) => M) {
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