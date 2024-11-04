import {CommandArgument} from "../CommandArgument";
import {TokenValue} from "../CommandProcessor";

export class ArrayArgument extends CommandArgument<TokenValue[]> {
    default = [];

    read(as, at, args, index) {
        return args[index].value;
    };

    blindCheck(args, index) {
        return {pass: args[index] && args[index].type === "array", index: index + 1};
    };

    toString() {
        return "array";
    };
}