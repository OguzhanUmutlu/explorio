import Command from "@/command/Command";
import CommandSender, {CommandAs} from "@/command/CommandSender";
import Position from "@/utils/Position";

export default class SayCommand extends Command {
    constructor() {
        super("say", "Teleport to a position.", "Usage: /say <...raw_text>", [], "command.say");
    };

    execute(_: CommandSender, as: CommandAs, __: Position, args: string[]) {
        as.server.broadcastMessage(`§d[${as.name}] ` + args.join(" "));
    };
}