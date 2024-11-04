import {CommandArgument} from "../CommandArgument";

export class LabelArgument extends CommandArgument<undefined> {
    default = undefined;

    read(as, at, args, index) {
        return undefined;
    };

    blindCheck(args, index) {
        return {pass: args[index] && args[index].rawText === this.name, index: index + 1};
    };

    toString() {
        return "";
    };

    toUsageString(): string {
        return this.name;
    };
}