import {CommandArgument} from "../CommandArgument";
import {AnyToken, TokenValue} from "../CommandProcessor";
import {CommandAs} from "../CommandSender";
import {Location} from "../../utils/Location";

export class ArrayArgument extends CommandArgument<TokenValue[]> {
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