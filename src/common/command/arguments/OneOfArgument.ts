import {CommandArgument} from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import {Position} from "@/utils/Position";
import {AnyToken} from "@/command/CommandProcessor";
import {CommandError} from "@/command/CommandError";

export class OneOfArgument<V = unknown> extends CommandArgument<V> {
    default = null;
    args: CommandArgument<V>[] = [];

    setArgs<T extends CommandArgument<V>[]>(args: T) {
        if (args.length === 0) throw new Error("Expected at least one argument");

        const newT = <OneOfArgument<{
            [K in keyof T]: T[K] extends CommandArgument<infer U> ? U : never;
        }[number]>>this;

        newT.args = args as typeof newT.args;
        newT.default = args[0].getDefault();
        return newT;
    };

    read(_: CommandAs, __: Position, args: AnyToken[], index: number) {
        for (const arg of this.args) {
            const r = arg.read(_, __, args, index);
            if (r !== null) return r;
        }

        throw new CommandError("Expected one of: " + this.toString());
    };

    blindCheck(args: AnyToken[], index: number) {
        for (const arg of this.args) {
            const r = arg.blindCheck(args, index);
            if (!r.error) return r;
        }

        return {
            error: {token: args[index], message: "Expected one of: " + this.toString()}, index: index + 1
        };
    };

    toString() {
        return this.args.map(arg => arg.toString()).join(" | ");
    };
}