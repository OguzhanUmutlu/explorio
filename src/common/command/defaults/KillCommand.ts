import {DefinitiveCommand} from "@/command/DefinitiveCommand";
import {CommandDefinition} from "@/command/CommandDefinition";
import {Player} from "@/entity/defaults/Player";
import {CommandError} from "@/command/CommandError";

export class KillCommand extends DefinitiveCommand {
    constructor() {
        super("kill", "Kills given entities.", [], "command.kill");
    };

    definitions = [
        new CommandDefinition()
            .addEntitiesArgument("entities", o => o.setMin(1))
            .then((sender, _, __, entities) => {
                if (entities.length === 0) throw new CommandError("No entities given.");

                for (const entity of entities) entity.kill();

                if (entities.length === 1) {
                    return sender.sendMessage(`Killed ${entities[0].name}`);
                }

                sender.sendMessage(`Killed ${entities.length} entities: ${entities.map(p => p.name).join(", ")}`);
            }),
        new CommandDefinition()
            .then(sender => {
                if (!(sender instanceof Player)) throw new CommandError("You must be a player to use this command.");
                sender.sendMessage(`Killed ${sender.name}`);
                sender.kill();
            })
    ];
}