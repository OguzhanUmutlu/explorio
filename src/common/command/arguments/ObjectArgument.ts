import CommandArgument from "@/command/CommandArgument";
import {AnyToken, TokenValue} from "@/command/CommandProcessor";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";

export default class ObjectArgument extends CommandArgument<Record<string, TokenValue>> {
    default = {};

    read(_: CommandAs, __: Location, args: AnyToken[], index: number) {
        return <Record<string, TokenValue>>args[index].value;
    };

    blindCheck(args: AnyToken[], index: number) {
        return {pass: args[index] && args[index].type === "object", index: index + 1};
    };

    toString() {
        return "object";
    };
}