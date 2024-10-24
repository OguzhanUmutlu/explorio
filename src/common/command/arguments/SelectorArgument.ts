import {CommandArgument} from "../CommandArgument";
import {SelectorToken} from "../CommandProcessor";
import {Entity} from "../../entity/Entity";

export class SelectorArgument extends CommandArgument<Entity[]> {
    read(as, at, args, index) {
        const arg = <SelectorToken>args[index];

        const targets = [];
        return {value: targets, index: index + 1};
    };

    blindCheck(args, index) {
        return {pass: args[index] instanceof SelectorToken, index: index + 1};
    };

    toString() {
        return "selector";
    };
}