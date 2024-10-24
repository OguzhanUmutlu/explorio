import {CommandArgument} from "../CommandArgument";

export class BoolArgument extends CommandArgument<boolean> {
    read(as, at, args, index) {
        return {value: <boolean>args[index].value, index: index + 1};
    };

    blindCheck(args, index) {
        return {pass: args[index].type === "bool", index: index + 1};
    };

    toString() {
        return "bool";
    };
}