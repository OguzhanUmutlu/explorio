import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";
import Player from "@/entity/defaults/Player";
import {GameModeNames} from "@/command/arguments/GameModeArgument";
import CommandError from "@/command/CommandError";

export default class GameModeCommand extends DefinitiveCommand {
    constructor() {
        super("gamemode", "Sets the game mode of a player.", ["gm"], "command.gamemode");
    };

    definitions = [
        new CommandDefinition()
            .addGameModeArgument("gamemode")
            .then((sender, as, _, gamemode) => {
                if (as instanceof Player) {
                    as.setGameMode(gamemode);
                    sender.sendMessage(
                        `Set the game mode of ${as.name} to ${GameModeNames[gamemode]}.`
                    );
                } else {
                    sender.sendMessage(
                        `Couldn't set the game mode of ${as.name} as it is not a player.`
                    );
                }
            }),
        new CommandDefinition()
            .addGameModeArgument("gamemode")
            .addEntitiesArgument("players", o => o.setFilter(e => e instanceof Player))
            .then((sender, _, __, gamemode, players) => {
                if (players.length === 0) {
                    throw new CommandError("No players given.");
                }

                for (const player of players) {
                    player.setGameMode(gamemode);
                }

                sender.sendMessage(
                    `Set the gamemode of ${players.length} ${players.length === 1 ? "player" : "players"} to ${GameModeNames[gamemode]}`
                );
            })
    ];
}