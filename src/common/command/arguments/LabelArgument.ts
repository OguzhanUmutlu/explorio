import {CommandArgument} from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import {Position} from "@/utils/Position";
import {AnyToken} from "@/command/CommandProcessor";

export class LabelArgument extends CommandArgument<undefined> {
    default = undefined;

    read(_: CommandAs, __: Position, ___: AnyToken[], ____: number) {
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