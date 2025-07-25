import CommandArgument from "@/command/CommandArgument";
import {AnyToken, TokenValue} from "@/command/CommandProcessor";
import {CommandAs} from "@/command/CommandSender";
import Position from "@/utils/Position";

export default class ObjectArgument extends CommandArgument<Record<string, TokenValue>> {
    default = {};

    read(_: CommandAs, __: Position, args: AnyToken[], index: number) {
        return <Record<string, TokenValue>>args[index].value;
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];
        return {
            error: arg && arg.type === "object" ? null : {
                token: arg,
                message: "Expected an object"
            }, index: index + 1
        };
    };

    toString() {
        return "object";
    };
}