import CommandSender from "@/command/CommandSender";
import Position from "@/utils/Position";
import {getServer} from "@/utils/Utils";

export default class ConsoleCommandSender extends Position implements CommandSender {
    static instance: ConsoleCommandSender;

    id = -1;

    name = "CONSOLE";
    permissions = new Set<string>;
    server = getServer();

    constructor() {
        super(0, 0, 0, getServer().defaultWorld);
        return ConsoleCommandSender.instance ??= this;
    };

    sendMessage(message: string): void {
        printer.info(message);
    };

    hasPermission(): boolean {
        return true;
    };
}