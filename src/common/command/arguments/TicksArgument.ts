import {CommandArgument} from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import {Position} from "@/utils/Position";
import {AnyToken} from "@/command/CommandProcessor";

const units = {
    t: 1,
    s: 20,
    d: 24000
};

export class TicksArgument extends CommandArgument<number> {
    default = 0;

    read(_: CommandAs, __: Position, args: AnyToken[], index: number) {
        const arg = args[index];

        if (arg.type === "number") return +arg.rawText;

        return +arg.rawText.slice(0, -1) * units[arg.rawText.at(-1).toLowerCase()];
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        if (!arg) return {
            error: {
                token: null,
                message: "Expected a number or a tick in the format `5t`, `5s` or `5d`"
            }, index: index + 1
        };

        if (arg.type === "number") return {error: null, index: index + 1};

        const rawText = arg.rawText;
        const num = +rawText.slice(0, -1);
        const unit = rawText.at(-1).toLowerCase();

        if (!units[unit]) return {
            error: {
                token: arg,
                message: "Expected a number or a tick in the format `5t`, `5s` or `5d`"
            }, index: index + 1
        };

        if (isNaN(num) || !Number.isInteger(num)) return {
            error: {
                token: arg,
                message: "Expected an integer for the number part of the tick argument"
            }, index: index + 1
        };

        return {error: null, index: index + 1};
    };

    toString() {
        return "tick";
    };
}