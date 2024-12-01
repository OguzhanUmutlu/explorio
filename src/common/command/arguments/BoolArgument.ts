import CommandArgument from "@/command/CommandArgument";
import {AnyToken} from "@/command/CommandProcessor";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";

export default class BoolArgument extends CommandArgument<boolean> {
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