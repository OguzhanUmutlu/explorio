import CommandArgument from "@/command/CommandArgument";
import {AnyToken} from "@/command/CommandProcessor";
import {CommandAs} from "@/command/CommandSender";
import Position from "@/utils/Position";

export default class BoolArgument extends CommandArgument<boolean> {
    default = false;

    read(_: CommandAs, __: Position, args: AnyToken[], index: number) {
        return <boolean>args[index].value;
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        return {
            error: arg && arg.type === "bool" ? null : {
                token: arg,
                message: "Expected a boolean"
            }, index: index + 1
        };
    };

    toString() {
        return "bool";
    };
}