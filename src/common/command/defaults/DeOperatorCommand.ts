import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";
import Player from "@/entity/defaults/Player";

export default class DeOperatorCommand extends DefinitiveCommand {
    constructor() {
        super("deop", "Revokes admin privileges to a player.", [], "*");
    };

    definitions = [
        new CommandDefinition()
            .addEntityArgument("player", o => o
                .setFilter(e => e instanceof Player)
                .setFilterError("Expected a player."))
            .then((sender, _, __, player) => {
                player.permissions.delete("*");

                sender.sendMessage(`Revoked admin privileges from ${player.name}.`);
            })
    ];
}