import CommandSender from "@/command/CommandSender";
import Position from "@/utils/Position";
import Server from "@/Server";

export default class ConsoleCommandSender extends Position implements CommandSender {
    static instance: ConsoleCommandSender;

    static get() {
        return ConsoleCommandSender.instance;
    };

    id = -1;

    name = "CONSOLE";
    permissions = new Set<string>;

    constructor(server: Server) {
        super(0, 0, 0, server.defaultWorld);
        return ConsoleCommandSender.instance ??= this;
    };

    sendMessage(message: string): void {
        printer.info(message);
    };

    hasPermission(): boolean {
        return true;
    };
}