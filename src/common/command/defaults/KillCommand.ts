import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";
import Player from "@/entity/defaults/Player";

export default class KillCommand extends DefinitiveCommand {
    constructor() {
        super("kill", "Kills given entities.", [], "command.kill");
    };

    definitions = [
        new CommandDefinition()
            .addEntitiesArgument("entities", o => o.setMin(1))
            .then((sender, _, __, entities) => {
                for (const entity of entities) {
                    entity.kill();
                }

                if (entities.length === 1) {
                    sender.sendMessage(`Killed ${entities[0].name}`);
                    return;
                }

                sender.sendMessage(`Killed ${entities.length} entities: ${entities.map(p => p.name).join(", ")}`);
            }),
        new CommandDefinition()
            .then(sender => {
                if (!(sender instanceof Player)) {
                    sender.sendMessage("You must be a player to use this command.");
                    return;
                }

                sender.sendMessage(`Killed ${sender.name}`);
                sender.kill();
            })
    ];
}