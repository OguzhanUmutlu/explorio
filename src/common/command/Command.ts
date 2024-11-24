import {CommandAs, CommandSender} from "./CommandSender";
import {Location} from "../utils/Location";

export class CommandError extends Error {
    constructor(public message: string) {
        super(message);
    };
}

export abstract class Command {
    usageMessage: string;

    protected constructor(
        public name: string,
        public description: string,
        public usage: string,
        public aliases: string[] = [],
        public permission: string | false = false
    ) {
        this.usageMessage = `§cUsage: /${name}${usage ? ` ${usage}` : ``}`;
    };

    init() {
    };

    abstract execute(sender: CommandSender, as: CommandAs, at: Location, args: string[], label: string): any;
}