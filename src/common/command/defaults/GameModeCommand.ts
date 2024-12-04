import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";
import Player from "@/entity/types/Player";
import {GameModeNames} from "@/command/arguments/GameModeArgument";

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
            .addEntitiesArgument("players", o => o.setFilter(e => e instanceof Player))
            .addGameModeArgument("gamemode")
            .then((sender, _, __, players, gamemode) => {
                for (const player of players) {
                    player.setGameMode(gamemode);
                }

                sender.sendMessage(
                    `Set the gamemode of ${players.length} ${players.length === 1 ? "player" : "players"} to ${GameModeNames[gamemode]}`
                );
            })
    ];
}