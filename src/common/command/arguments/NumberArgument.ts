import {CommandArgument} from "../CommandArgument";
import {CommandAs} from "../CommandSender";
import {Location} from "../../utils/Location";
import {AnyToken} from "../CommandProcessor";

export class NumberArgument extends CommandArgument<number> {
    default = 0;

    read(_: CommandAs, __: Location, args: AnyToken[], index: number) {
        return <number>args[index].value;
    };

    blindCheck(args: AnyToken[], index: number) {
        return {pass: args[index] && args[index].type === "number", index: index + 1};
    };

    toString() {
        return "number";
    };
}