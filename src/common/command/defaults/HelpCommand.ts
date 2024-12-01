import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";

export default class HelpCommand extends DefinitiveCommand {
    constructor() {
        super("help", "Opens the help menu.", ["?"]);
    };

    definitions = [
        new CommandDefinition()
            .addNumberArgument("page", o => o.setOptional().setDefault(1))
            .then((sender, _, __, page) => {
                page -= 1;

                const commands = Array.from(new Set(Object.values(sender.server.commands)));
                const pageSize = 10;

                let str = `§a-- Command List ${page + 1}/${Math.ceil(commands.length / pageSize)} --`;

                for (let i = page * pageSize; i < (page + 1) * pageSize; i++) {
                    if (commands[i]) {
                        const command = commands[i];
                        str += `\n§d/${command.name} §f- §b${command.description}`;
                    }
                }

                sender.sendMessage(str);
            })
    ];
}