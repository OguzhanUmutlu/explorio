import CommandArgument from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";
import {AnyToken} from "@/command/CommandProcessor";
import Effect from "@/effect/Effect";
import {EffectIds, Effects} from "@/meta/Effects";

export default class EffectArgument extends CommandArgument<Effect> {
    default = Effects[0];

    read(_: CommandAs, __: Location, args: AnyToken[], index: number) {
        const arg = args[index];
        const raw = arg.rawText;

        if (raw in Effects) return Effects[raw];

        return Effects[EffectIds[Object.keys(EffectIds).find(i => i.toLowerCase() === raw)]];
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

        return {
            error: raw in Effects || Object.keys(EffectIds).some(i => i.toLowerCase() === raw) ? null : {
                token: arg,
                message: "Expected a valid effect name"
            }, index: index + 1
        };
    };

    toString() {
        return "effect";
    };
}