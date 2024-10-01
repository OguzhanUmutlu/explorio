import {CommandSender} from "./CommandSender";

export enum CommandResponse {
    USAGE,
    PERMISSION,
    INVALID,
    SUCCESS
}

export abstract class Command {
    usageMessage: string;

    protected constructor(
        public name: string,
        public description: string,
        public usage: string,
        public aliases: string[] = [],
        public permission = false
    ) {
        this.usageMessage = `§cUsage: /${name}${usage ? ` ${usage}` : ``}`;
    };

    init() {
    };

    abstract execute(sender: CommandSender, args: string[], command: string): CommandResponse;
}