import {CommandArgument} from "../CommandArgument";
import {CommandAs} from "../CommandSender";
import {Location} from "../../utils/Location";
import {AnyToken} from "../CommandProcessor";

export class LabelArgument extends CommandArgument<undefined> {
    default = undefined;

    read(_: CommandAs, __: Location, ___: AnyToken[], ____: number) {
        return undefined;
    };

    blindCheck(args: AnyToken[], index: number) {
        return {pass: args[index] && args[index].rawText === this.name, index: index + 1};
    };

    toString() {
        return "";
    };

    toUsageString(): string {
        return this.name;
    };
}