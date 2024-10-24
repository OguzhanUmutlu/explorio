import {CommandSender} from "./CommandSender";
import {Server} from "../Server";

export class ConsoleCommandSender implements CommandSender {
    static instance: ConsoleCommandSender;

    name = "CONSOLE";
    permissions = new Set;

    constructor(public server: Server) {
        return ConsoleCommandSender.instance ??= this;
    };

    sendMessage(message: string): void {
        printer.info(message);
    };

    hasPermission(permission: string): boolean {
        return true;
    };
}