import DefinitiveCommand from "$/command/DefinitiveCommand";
import CommandDefinition from "$/command/CommandDefinition";
import Effect from "$/effect/Effect";
import {EffectIds} from "$/utils/Effects";
import {splitByUnderscore} from "$/utils/Utils";
import Entity from "$/entity/Entity";
import CommandSender from "$/command/CommandSender";

function getEffectName(effect: Effect) {
    return splitByUnderscore(Object.keys(EffectIds).find(i => effect.id === EffectIds[i]));
}

function handleArgs(sender: CommandSender, duration: number, amplifier: number) {
    duration = Math.floor(duration);
    if (duration > 2 ** 32 - 1) duration = Infinity;

    if (duration < 0) {
        sender.sendMessage("Effect duration must be greater than 0.");
        return null;
    }

    if (amplifier < 1 || amplifier > 255) {
        sender.sendMessage("Effect amplifier must be between 1 and 255.");
        return null;
    }

    return [duration, amplifier];
}

export default class EffectCommand extends DefinitiveCommand {
    constructor() {
        super("effect", "Adds and removes effects.", [], "command.effect");
    };

    definitions = [
        new CommandDefinition()
            .addEffectArgument("effect")
            .addNumberArgument("duration")
            .addNumberArgument("amplifier", o => o.setOptional().setDefault(1))
            .then((sender, as, _, effect, duration, amplifier) => {
                const r = handleArgs(sender, duration, amplifier);
                if (!r) return;
                [duration, amplifier] = r;

                if (as instanceof Entity) {
                    as.addEffect(effect, amplifier, duration);
                    sender.sendMessage(
                        `Added the ${getEffectName(effect)} effect to ${as.name}`
                    );
                } else {
                    sender.sendMessage(
                        `Couldn't add the effect to ${as.name} as it is not an entity.`
                    );
                }
            }),
        new CommandDefinition()
            .addEntitiesArgument("entities")
            .addEffectArgument("effect")
            .addNumberArgument("duration")
            .addNumberArgument("amplifier", o => o.setOptional().setDefault(1))
            .then((sender, _, __, players: Entity[], effect, duration, amplifier) => {
                const r = handleArgs(sender, duration, amplifier);
                if (!r) return;
                [duration, amplifier] = r;

                for (const player of players) {
                    player.addEffect(effect, amplifier, duration);
                }

                sender.sendMessage(
                    `Added the ${getEffectName(effect)} effect to ${players.length} ${players.length === 1 ? "entity" : "entities"}.`
                );
            })
    ];
}