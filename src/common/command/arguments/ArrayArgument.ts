import CommandArgument from "@/command/CommandArgument";
import {AnyToken, TokenValue} from "@/command/CommandProcessor";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";

export default class ArrayArgument extends CommandArgument<TokenValue[]> {
    default = [];

    read(_: CommandAs, __: Location, args: AnyToken[], index: number) {
        return <TokenValue[]>args[index].value;
    };

    blindCheck(args: AnyToken[], index: number) {
        return {pass: args[index] && args[index].type === "array", index: index + 1};
    };

    toString() {
        return "array";
    };
}