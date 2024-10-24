import {CommandArgument} from "../CommandArgument";

export class NumberArgument extends CommandArgument<number> {
    read(as, at, args, index) {
        return {value: <number>args[index].value, index: index + 1};
    };

    blindCheck(args, index) {
        return {pass: args[index].type === "number", index: index + 1};
    };

    toString() {
        return "number";
    };
}