import DefinitiveCommand from "$/command/DefinitiveCommand";
import CommandDefinition from "$/command/CommandDefinition";

export default class TeleportCommand extends DefinitiveCommand {
    constructor() {
        super("teleport", "Teleport to a position.", ["tp"], "command.teleport");
    };

    definitions = [
        new CommandDefinition()
            .addEntitiesArgument("entities")
            .addPositionArgument("position")
            .then((sender, _, __, entities, pos) => {
                entities.forEach(e => {
                    e.teleport(pos.x, pos.y);
                });

                sender.sendMessage(
                    `${entities.length} entities have been teleported to `
                    + `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`
                );
            }),
        new CommandDefinition()
            .addPositionArgument("position")
            .then((sender, as, _, pos) => {
                if (!as || !("teleport" in as)) {
                    sender.sendMessage("No entities given");
                    return;
                }

                as.teleport(pos.x, pos.y);

                sender.sendMessage(
                    `Teleported ${as.name} to (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`
                );
            }),
        new CommandDefinition()
            .addEntityArgument("target")
            .then((sender, as, _, target) => {
                if (!as || !("teleport" in as)) {
                    sender.sendMessage("No entities given");
                    return;
                }

                as.teleport(target.x, target.y);

                sender.sendMessage(
                    `Teleported to (${target.x.toFixed(2)}, ${target.y.toFixed(2)})`
                );
            }),
        new CommandDefinition()
            .addEntitiesArgument("entities")
            .addEntityArgument("target")
            .then((sender, _, __, entities, target) => {
                entities.forEach(entity => {
                    entity.teleport(target.x, target.y);
                });

                sender.sendMessage(
                    `${entities.length} ${entities.length === 1 ? "entity has" : "entities have"} been teleported to `
                    + `(${target.x.toFixed(2)}, ${target.y.toFixed(2)})`
                );
            })
    ];
}