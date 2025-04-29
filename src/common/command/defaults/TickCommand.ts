import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";

export default class TickCommand extends DefinitiveCommand {
    constructor() {
        super("tick", "Manages the server's ticks", [], "command.tick");
    };

    definitions = [
        new CommandDefinition()
            .addLabelArgument("query")
            .setPermission("command.tick.query")
            .then(sender => {
                sender.sendMessage("Server's current tick rate is: " + sender.server.tickRate.toFixed(2) + "TPS");
            }),
        new CommandDefinition()
            .addLabelArgument("freeze")
            .setPermission("command.tick.freeze")
            .then(sender => {
                sender.server.tickFrozen = true;
                sender.sendMessage("Server ticks have been frozen.");
            }),
        new CommandDefinition()
            .addLabelArgument("unfreeze")
            .setPermission("command.tick.unfreeze")
            .then(sender => {
                sender.server.tickFrozen = false;
                sender.sendMessage("Server ticks have been unfrozen.");
            }),
        new CommandDefinition()
            .addLabelArgument("rate")
            .addNumberArgument("rate", o => o.setMin(1).setMax(1000).forceInteger().setOptional())
            .setPermission("command.tick.rate")
            .then((sender, _, __, rate) => {
                if (!rate) {
                    sender.sendMessage("Server's current target tick rate is: " + sender.server.targetTickRate.toFixed(2) + "TPS");
                    return;
                }

                sender.server.targetTickRate = rate;
                sender.sendMessage(`Server tick rate has been set to ${rate}.`);
            }),
        new CommandDefinition()
            .addLabelArgument("step")
            .addLabelArgument("stop")
            .setPermission("command.tick.step.stop")
            .then(sender => {
                sender.server.stepTicks = 0;
                sender.sendMessage("Server's tick stepping has been reset.");
            }),
        new CommandDefinition()
            .addLabelArgument("step")
            .addTicksArgument("ticks")
            .setPermission("command.tick.step.add")
            .then((sender, _, __, ticks) => {
                sender.server.stepTicks = ticks;
                sender.sendMessage(`Server will now be running for ${ticks} ticks at normal speed.`);
            }),
        new CommandDefinition()
            .addLabelArgument("sprint")
            .addLabelArgument("stop")
            .setPermission("command.tick.sprint.stop")
            .then(sender => {
                sender.server.tickNow = 0;
                sender.sendMessage("Server's tick sprinting has been reset.");
            }),
        new CommandDefinition()
            .addLabelArgument("sprint")
            .addTicksArgument("ticks")
            .setPermission("command.tick.sprint.add")
            .then((sender, _, __, ticks) => {
                sender.server.tickNow = ticks;
                sender.sendMessage(`Server is now going to run ${ticks} ticks as fast as possible.`);
            })
    ];
}