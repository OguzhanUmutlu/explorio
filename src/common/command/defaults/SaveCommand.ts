import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";

export default class SaveCommand extends DefinitiveCommand {
    constructor() {
        super("save", "Saves the server.", [], "command.save");
    };

    definitions = [
        new CommandDefinition()
            .then(async sender => {
                sender.sendMessage("§eSaving the server...");
                await sender.server.saveAll();
                sender.sendMessage("§aServer saved!");
            })
    ];
}