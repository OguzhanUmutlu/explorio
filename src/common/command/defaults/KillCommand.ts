import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";

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
            })
    ];
}