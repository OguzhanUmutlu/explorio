import {DefinitiveCommand} from "../DefinitiveCommand";
import {CommandDefinition} from "../CommandDefinition";

export class ListCommand extends DefinitiveCommand {
    constructor() {
        super("list", "Lists given selector's result.", ["list"]);
    };

    definitions = [
        new CommandDefinition()
            .then(sender => {
                const players = Object.keys(sender.server.players);

                if (players.length === 0) {
                    sender.sendMessage("No players online");
                } else {
                    sender.sendMessage(`Online player${players.length === 1 ? "" : "s"}(${players.length}): ${players.join(", ")}`);
                }

                return players.length;
            }),
        new CommandDefinition()
            .addEntitiesArgument("entities")
            .then((sender, _, __, entities) => {
                sender.sendMessage(`Found ${entities.length} ${entities.length === 1 ? "entities" : "entities"}: ${entities.join(", ")}`);

                return entities.length;
            })
    ];
}