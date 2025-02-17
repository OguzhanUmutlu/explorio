import CommandSender from "@/command/CommandSender";
import Location from "@/utils/Location";
import {getServer} from "@/utils/Utils";

export default class ConsoleCommandSender extends Location implements CommandSender {
    static instance: ConsoleCommandSender;

    id = -1;

    name = "CONSOLE";
    permissions = new Set<string>;
    server = getServer();
    location = new Location(0, 0, 0, this.server.defaultWorld);

    constructor() {
        super(0, 0, 0, getServer().defaultWorld);
        return ConsoleCommandSender.instance ??= this;
    };

    sendMessage(message: string): void {
        printer.info(message);
    };

    chat(message: string) {
        this.sendMessage(message); // I guess?
    };

    hasPermission(): boolean {
        return true;
    };
}