import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";

import CommandSender from "@/command/CommandSender";
import Entity from "@/entity/Entity";

function handleArgs(sender: CommandSender, duration: number, amplifier: number) {
    duration = Math.floor(duration);
    if (duration > 2 ** 32 - 1) duration = Infinity;

    if (duration <= 0) {
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
            .addLabelArgument("give")
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
                    `Added the ${effect.name} effect to ${players.length} ${players.length === 1 ? "entity" : "entities"}.`
                );
            }),
        new CommandDefinition()
            .addLabelArgument("clear")
            .addEntitiesArgument("entities")
            .addEffectArgument("effect")
            .then((sender, _, __, players: Entity[], effect) => {
                for (const player of players) {
                    player.removeEffect(effect);
                }

                sender.sendMessage(
                    `Removed the ${effect.name} effect from ${players.length} ${players.length === 1 ? "entity" : "entities"}.`
                );
            })
    ];
}