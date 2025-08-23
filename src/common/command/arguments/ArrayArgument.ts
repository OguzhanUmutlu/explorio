import {CommandArgument} from "@/command/CommandArgument";
import {AnyToken, TokenValue} from "@/command/CommandProcessor";
import {CommandAs} from "@/command/CommandSender";
import {Position} from "@/utils/Position";

export class ArrayArgument extends CommandArgument<TokenValue[]> {
    default = [];

    read(_: CommandAs, __: Position, args: AnyToken[], index: number) {
        return <TokenValue[]>args[index].value;
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        return {
            error: arg && arg.type === "array" ? null : {
                token: arg,
                message: "Expected an array"
            }, index: index + 1
        };
    };

    toString() {
        return "array";
    };
}