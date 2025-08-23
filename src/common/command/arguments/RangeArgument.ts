import {CommandArgument} from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import {Position} from "@/utils/Position";
import {AnyToken} from "@/command/CommandProcessor";

export class RangeArgument extends CommandArgument<[number, number]> {
    default = <[number, number]>[0, 0];

    read(_: CommandAs, __: Position, args: AnyToken[], index: number) {
        return <[number, number]>args[index].value;
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        return {
            error: arg && arg.type === "range" ? null : {
                token: arg,
                message: "Expected a range"
            }, index: index + 1
        };
    };

    toString() {
        return "number";
    };
}