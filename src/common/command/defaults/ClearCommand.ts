import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";
import Player from "@/entity/defaults/Player";
import CommandError from "@/command/CommandError";

export default class ClearCommand extends DefinitiveCommand {
    constructor() {
        super("clear", "Clears the inventory.", [], "command.clear");
    };

    definitions = [
        new CommandDefinition()
            .addEntitiesArgument("players", o => o
                .setFilter(e => e instanceof Player)
                .setFilterError("Expected player entities for the selector.")
                .setOptional())
            .then((sender, as, _, players) => {
                if (players.length === 0) {
                    if (!(as instanceof Player)) throw new CommandError("Source has to be a player to clear their inventory.");
                    players.push(as);
                }

                for (const player of players) {
                    player.clearInventories();
                }

                if (players.length === 1) {
                    sender.sendMessage(`Cleared the inventory of ${players[0].name}.`);
                } else {
                    sender.sendMessage(`Cleared the inventories of ${players.length} ${players.length === 1 ? "player" : "players"}.`);
                }
            })
    ];
}