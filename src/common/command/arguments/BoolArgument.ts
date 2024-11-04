import {CommandArgument} from "../CommandArgument";

export class BoolArgument extends CommandArgument<boolean> {
    default = false;

    read(as, at, args, index) {
        return args[index].value;
    };

    blindCheck(args, index) {
        return {pass: args[index] && args[index].type === "bool", index: index + 1};
    };

    toString() {
        return "bool";
    };
}