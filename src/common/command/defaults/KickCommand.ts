import {DefinitiveCommand} from "@/command/DefinitiveCommand";
import {CommandDefinition} from "@/command/CommandDefinition";
import {Player} from "@/entity/defaults/Player";
import {CommandError} from "@/command/CommandError";

export class KickCommand extends DefinitiveCommand {
    constructor() {
        super("kick", "Kicks a player.", [], "command.kick");
    };

    definitions = [
        new CommandDefinition()
            .addEntitiesArgument("players", o => o
                .setFilter(e => e instanceof Player)
                .setFilterError("Expected player entities for the selector.")
                .setMin(1))
            .addTextArgument("reason", o => o.setOptional().setDefault("Kicked by an operator"))
            .then((sender, _, __, players, reason) => {
                if (players.length === 0) throw new CommandError("No players given.");

                for (const player of players) player.kick(reason);

                sender.sendMessage(`Kicked ${players.length} players: ${players.map(p => p.name).join(", ")}`);
            })
    ];
}