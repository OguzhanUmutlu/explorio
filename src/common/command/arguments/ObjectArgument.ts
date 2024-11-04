import {CommandArgument} from "../CommandArgument";
import {TokenValue} from "../CommandProcessor";

export class ObjectArgument extends CommandArgument<Record<string, TokenValue>> {
    default = {};

    read(as, at, args, index) {
        return args[index].value;
    };

    blindCheck(args, index) {
        return {pass: args[index] && args[index].type === "object", index: index + 1};
    };

    toString() {
        return "object";
    };
}