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
import Position from "@/utils/Position";
import EntityArgument from "@/command/arguments/EntityArgument";
import LabelArgument from "@/command/arguments/LabelArgument";
import EffectArgument from "@/command/arguments/EffectArgument";
import ItemArgument from "@/command/arguments/ItemArgument";
import EntityTypeArgument from "@/command/arguments/EntityTypeArgument";
import TicksArgument from "@/command/arguments/TicksArgument";
import {OneOfArgument} from "@/command/arguments/OneOfArgument";

export type Append<T extends unknown[] | [], V> = T extends [] ? [V] : [...T, V];

export type CommandDefinitionType = CommandDefinition<CommandArgument[]>;

export default class CommandDefinition<T extends CommandArgument[] = []> {
    permission: string | false = false;
    arguments = <CommandArgument[]>[];
    run: (sender: CommandSender, as: CommandAs | null, at: Position, ...args: { [K in keyof T]: T[K]["__TYPE__"] }) => number | void | Promise<number | void>;

    addArgumentViaClass<V extends CommandArgument>(clazz: new (name: string) => V, name: string, fn?: (n: V) => V) {
        const arg = new clazz(name);
        if (fn) fn(arg);
        this.arguments.push(arg);
        return <CommandDefinition<Append<T, V>>>this;
    };

    addNumberArgument<M extends NumberArgument>(name: string, fn?: (n: NumberArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(NumberArgument, name, fn);
    };

    addTicksArgument<M extends TicksArgument>(name: string, fn?: (n: TicksArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(TicksArgument, name, fn);
    };

    addGameModeArgument<M extends GameModeArgument>(name: string, fn?: (n: GameModeArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(GameModeArgument, name, fn);
    };

    addEffectArgument<M extends EffectArgument>(name: string, fn?: (n: EffectArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(EffectArgument, name, fn);
    };

    addItemArgument<M extends ItemArgument>(name: string, fn?: (n: ItemArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(ItemArgument, name, fn);
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

    addEntityTypeArgument<M extends EntityTypeArgument>(name: string, fn?: (n: EntityTypeArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(EntityTypeArgument, name, fn);
    };

    addLabelArgument<M extends LabelArgument>(name: string, fn?: (n: LabelArgument) => M) {
        return <CommandDefinition<T>>this.addArgumentViaClass(LabelArgument, name, fn);
    };

    addOneOfArgument<K, M extends OneOfArgument<K>>(name: string, fn?: (n: OneOfArgument) => M): CommandDefinition<Append<T, M>> {
        return this.addArgumentViaClass(OneOfArgument, name, fn);
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