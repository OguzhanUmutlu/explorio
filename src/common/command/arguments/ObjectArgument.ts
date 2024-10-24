import {CommandArgument} from "../CommandArgument";
import {TokenValue} from "../CommandProcessor";

export class ObjectArgument extends CommandArgument<Record<string, TokenValue>> {
    read(as, at, args, index) {
        return {value: <Record<string, TokenValue>>args[index].value, index: index + 1};
    };

    blindCheck(args, index) {
        return {pass: args[index].type === "object", index: index + 1};
    };

    toString() {
        return "object";
    };
}