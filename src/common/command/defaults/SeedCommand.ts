import {DefinitiveCommand} from "@/command/DefinitiveCommand";
import {CommandDefinition} from "@/command/CommandDefinition";
import {Player} from "@/entity/defaults/Player";

export class SeedCommand extends DefinitiveCommand {
    constructor() {
        super("seed", "Gives you the seed of the world you're in.", [], "command.seed");
    };

    definitions = [
        new CommandDefinition()
            .then(sender => {
                const world = sender instanceof Player ? sender.world : sender.server.defaultWorld;
                sender.sendMessage(`The seed of this world is: [§a${world.seed}§r]`);
            })
    ];
}