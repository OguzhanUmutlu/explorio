import CommandArgument from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import Position from "@/utils/Position";
import {AnyToken} from "@/command/CommandProcessor";
import CommandError from "@/command/CommandError";

export default class NumberArgument extends CommandArgument<number> {
    default = 0;
    min = -Infinity;
    max = Infinity;
    integer = false;

    setMin(min: number) {
        this.min = min;
        return this;
    };

    setMax(max: number) {
        this.max = max;
        return this;
    };

    forceInteger(integer = true) {
        this.integer = integer;
        return this;
    };

    read(_: CommandAs, __: Position, args: AnyToken[], index: number) {
        const value = <number>args[index].value;

        if (value < this.min || value > this.max) throw new CommandError("Number out of range");

        if (this.integer && !Number.isInteger(value)) throw new CommandError("Number is not an integer");

        return value;
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        return {
            error: arg && arg.type === "number" ? null : {
                token: arg,
                message: "Expected a number"
            }, index: index + 1
        };
    };

    toString() {
        return "number";
    };
}