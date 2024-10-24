import {CommandArgument} from "../CommandArgument";
import {TokenValue} from "../CommandProcessor";

export class ArrayArgument extends CommandArgument<TokenValue[]> {
    read(as, at, args, index) {
        return {value: <TokenValue[]>args[index].value, index: index + 1};
    };

    blindCheck(args, index) {
        return {pass: args[index].type === "array", index: index + 1};
    };

    toString() {
        return "array";
    };
}