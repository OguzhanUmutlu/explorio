import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";
import Player from "@/entity/defaults/Player";

export default class BanCommand extends DefinitiveCommand {
    constructor() {
        super("ban", "Banishes a player.", [], "command.ban");
    };

    definitions = [
        new CommandDefinition()
            .addEntitiesArgument("players", o => o
                .setFilter(e => e instanceof Player)
                .setFilterError("Expected player entities for the selector.")
                .setMin(1))
            .addTextArgument("reason", o => o.setOptional().setDefault("Banned by an operator"))
            .then((sender, _, __, players, reason) => {
                for (const player of players) {
                    player.ban(reason);
                }

                sender.sendMessage(`Banned ${players.length} players: ${players.map(p => p.name).join(", ")}`);
            })
    ];
}