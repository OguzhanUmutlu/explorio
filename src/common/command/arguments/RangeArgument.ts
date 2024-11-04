import {CommandArgument} from "../CommandArgument";

export class RangeArgument extends CommandArgument<[number, number]> {
    default = [0, 0];

    read(as, at, args, index) {
        return args[index].value;
    };

    blindCheck(args, index) {
        return {pass: args[index] && args[index].type === "range", index: index + 1};
    };

    toString() {
        return "number";
    };
}