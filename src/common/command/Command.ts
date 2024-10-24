import {CommandSender} from "./CommandSender";
import {CommandDefinition} from "./CommandDefinition";
import {Token} from "./CommandProcessor";

export class CommandSuccess {
    constructor(public message: string) {
    };
}

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

    abstract define(source: CommandSender, args: Token[], params: string): CommandDefinition;
}