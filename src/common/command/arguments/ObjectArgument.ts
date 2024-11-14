import {CommandArgument} from "../CommandArgument";
import {AnyToken, TokenValue} from "../CommandProcessor";
import {CommandAs} from "../CommandSender";
import {Location} from "../../utils/Location";

export class ObjectArgument extends CommandArgument<Record<string, TokenValue>> {
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