import CommandArgument from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";
import {AnyToken} from "@/command/CommandProcessor";

export default class LabelArgument extends CommandArgument<undefined> {
    default = undefined;

    read(_: CommandAs, __: Location, ___: AnyToken[], ____: number) {
        return undefined;
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        return {
            error: arg && arg.rawText === this.name ? null : {
                token: arg,
                message: `Expected '${this.name}'.`
            }, index: index + 1
        };
    };

    toString() {
        return "";
    };

    toUsageString(): string {
        return this.name;
    };
}