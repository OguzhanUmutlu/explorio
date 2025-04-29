import CommandArgument from "@/command/CommandArgument";
import {AnyToken} from "@/command/CommandProcessor";
import {CommandAs} from "@/command/CommandSender";
import Position from "@/utils/Position";

export default class TokenArgument extends CommandArgument<AnyToken> {
    default = null;

    read(_: CommandAs, __: Position, args: AnyToken[], index: number) {
        return args[index];
    };

    blindCheck(args: AnyToken[], index: number) {
        return {error: args[index] ? null : {token: null, message: "Expected any token"}, index: index + 1};
    };

    toString() {
        return "token";
    };
}