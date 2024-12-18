import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";
import Player from "@/entity/defaults/Player";
import CommandError from "@/command/CommandError";

export default class GiveCommand extends DefinitiveCommand {
    constructor() {
        super("give", "Gives items to players.", [], "command.give");
    };

    definitions = [
        new CommandDefinition()
            .addEntitiesArgument("players", o => o
                .setFilter(e => e instanceof Player)
                .setFilterError("Expected player entities for the selector."))
            .addItemArgument("item")
            .addNumberArgument("count", o => o.setDefault(1).setOptional())
            .then((sender, _, __, players, item, count) => {
                if (players.length === 0) {
                    throw new CommandError("No players given.");
                }

                for (const player of players) {
                    player.addItem(item.toItem(count));
                    player.playSound("assets/sounds/random/pop.ogg");
                }

                sender.sendMessage(`${players.length} players have been given ${item.name}.`);
            })
    ];
}