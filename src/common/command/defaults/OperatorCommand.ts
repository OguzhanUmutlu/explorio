import {DefinitiveCommand} from "@/command/DefinitiveCommand";
import {CommandDefinition} from "@/command/CommandDefinition";
import {Player} from "@/entity/defaults/Player";

export class OperatorCommand extends DefinitiveCommand {
    constructor() {
        super("op", "Gives admin privileges to a player.", [], "*");
    };

    definitions = [
        new CommandDefinition()
            .addEntityArgument("player", o => o
                .setFilter(e => e instanceof Player)
                .setFilterError("Expected a player."))
            .then((sender, _, __, player) => {
                player.permissions.add("*");

                sender.sendMessage(`Gave admin privileges to ${player.name}.`);
            })
    ];
}