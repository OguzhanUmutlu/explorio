import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";
import Player from "@/entity/types/Player";

export default class ClearCommand extends DefinitiveCommand {
    constructor() {
        super("clear", "Clears the inventory.", [], "command.clear");
    };

    definitions = [
        new CommandDefinition()
            .then((sender, as) => {
                if (as instanceof Player) {
                    as.clearInventories();
                    sender.sendMessage(`Cleared the inventory of ${as.name}.`);
                } else {
                    sender.sendMessage("Expected a player to clear their inventory.");
                }
            })
    ];
}