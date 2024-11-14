import {CommandArgument} from "../CommandArgument";
import {AnyToken} from "../CommandProcessor";
import {CommandAs} from "../CommandSender";
import {Location} from "../../utils/Location";

export class TokenArgument extends CommandArgument<AnyToken> {
    default = null;

    read(_: CommandAs, __: Location, args: AnyToken[], index: number) {
        return args[index];
    };

    blindCheck(args: AnyToken[], index: number) {
        return {pass: !!args[index], index: index + 1};
    };

    toString() {
        return "token";
    };
}