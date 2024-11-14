import {CommandArgument} from "../CommandArgument";
import {AnyToken} from "../CommandProcessor";
import {CommandAs} from "../CommandSender";
import {Location} from "../../utils/Location";

export class BoolArgument extends CommandArgument<boolean> {
    default = false;

    read(_: CommandAs, __: Location, args: AnyToken[], index: number) {
        return <boolean>args[index].value;
    };

    blindCheck(args: AnyToken[], index: number) {
        return {pass: args[index] && args[index].type === "bool", index: index + 1};
    };

    toString() {
        return "bool";
    };
}