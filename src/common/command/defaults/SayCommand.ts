import Command from "@/command/Command";
import CommandSender, {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";

export default class SayCommand extends Command {
    constructor() {
        super("say", "Teleport to a position.", "Usage: /say <...raw_text>", [], "command.say");
    };

    execute(_: CommandSender, as: CommandAs, __: Location, args: string[]) {
        as.server.broadcastMessage(`§d[${as.name}] ` + args.join(" "));
    };
}