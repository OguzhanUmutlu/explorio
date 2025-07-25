import CommandArgument from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import Position from "@/utils/Position";
import {AnyToken} from "@/command/CommandProcessor";
import Effect from "@/effect/Effect";
import {getServer} from "@/utils/Utils";

export default class EffectArgument extends CommandArgument<Effect> {
    get default(): never {
        throw new Error(`No default value set for the '${this.name}' argument.`);
    };

    read(as: CommandAs, _: Position, args: AnyToken[], index: number) {
        const arg = args[index];
        const raw = arg.rawText;
        const server = as.server;

        if (raw in server.registeredEffects) return server.registeredEffects[raw];

        return server.effectNameToId[raw];
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        if (!arg) return {
            error: {
                token: null,
                message: "Expected an effect name"
            }, index: index + 1
        };
        const raw = arg.rawText;
        const server = getServer();

        return {
            error: raw in server.registeredEffects || raw in server.effectNameToId ? null : {
                token: arg,
                message: "Expected a valid effect name"
            }, index: index + 1
        };
    };

    toString() {
        return "effect";
    };
}