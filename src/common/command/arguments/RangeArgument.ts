import CommandArgument from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";
import {AnyToken} from "@/command/CommandProcessor";

export default class RangeArgument extends CommandArgument<[number, number]> {
    default = <[number, number]>[0, 0];

    read(_: CommandAs, __: Location, args: AnyToken[], index: number) {
        return <[number, number]>args[index].value;
    };

    blindCheck(args: AnyToken[], index: number) {
        return {pass: args[index] && args[index].type === "range", index: index + 1};
    };

    toString() {
        return "number";
    };
}