import {CommandArgument} from "../CommandArgument";
import {AnyToken} from "../CommandProcessor.js";

export class TokenArgument extends CommandArgument<AnyToken> {
    default = null;

    read(as, at, args, index) {
        return args[index];
    };

    blindCheck(args, index) {
        return {pass: !!args[index], index: index + 1};
    };

    toString() {
        return "token";
    };
}