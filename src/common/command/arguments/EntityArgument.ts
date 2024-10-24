import {CommandArgument} from "../CommandArgument";
import {SelectorToken} from "../CommandProcessor";
import {Entity} from "../../entity/Entity";

export class EntityArgument extends CommandArgument<Entity> {
    read(as, at, args, index) {
        const arg = <SelectorToken>args[index];

        const targets = [];
        // TODO: handle selector filters etc.
        if (targets.length !== 1) throw new Error(`Expected one target, got ${targets.length}.`);

        return {value: <Entity>targets[0], index: index + 1};
    };

    blindCheck(args, index) {
        return {pass: args[index] instanceof SelectorToken, index: index + 1};
    };

    toString() {
        return "entity";
    };
}