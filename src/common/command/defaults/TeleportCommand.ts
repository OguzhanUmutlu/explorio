import {AdvancedCommand} from "../AdvancedCommand";
import {Player} from "../../entity/types/Player";
import {CommandError} from "../Command";
import {CommandDefinition} from "../CommandDefinition";

export class TeleportCommand extends AdvancedCommand {
    constructor() {
        super("teleport", "Teleport to a position.", ["tp"], "command.teleport");
    };

    definitions = [
        new CommandDefinition()
            .addSelectorArgument("entities")
            .addPositionArgument("position")
            .then((source, as, at, entities, pos) => {
                entities.forEach(e => {
                    e.teleport(pos.x, pos.y);
                });

                return `${entities.length} entities have been teleported to (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`;
            }),
        new CommandDefinition()
            .addPositionArgument("position")
            .then((source, as, at, pos) => {
                if (!(as instanceof Player)) throw new CommandError("You must be a player to teleport.");
                as.teleport(pos.x, pos.y);

                return `Teleported to (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`;
            }),
        new CommandDefinition()
            .addEntityArgument("target")
            .then((source, as, at, target) => {
                if (!(as instanceof Player)) throw new CommandError("You must be a player to teleport.");

                as.teleport(target.x, target.y);

                return `Teleported to (${target.x.toFixed(2)}, ${target.y.toFixed(2)})`;
            }),
        new CommandDefinition()
            .addSelectorArgument("entities")
            .addEntityArgument("target")
            .then((source, as, at, entities, target) => {
                entities.forEach(e => {
                    e.teleport(target.x, target.y);
                });

                return `${entities.length} entities have been teleported to (${target.x.toFixed(2)}, ${target.y.toFixed(2)})`;
            })
    ];
}