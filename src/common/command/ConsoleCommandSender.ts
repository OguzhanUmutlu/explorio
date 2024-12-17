import CommandSender from "@/command/CommandSender";
import Location from "@/utils/Location";
import {getServer} from "@/utils/Utils";

export default class ConsoleCommandSender implements CommandSender {
    static instance: ConsoleCommandSender;

    id = -1;

    name = "CONSOLE";
    permissions = new Set<string>;
    server = getServer();
    location = new Location(0, 0, 0, this.server.defaultWorld);

    constructor() {
        return ConsoleCommandSender.instance ??= this;
    };

    get x() {
        return this.location.x;
    }

    get y() {
        return this.location.y;
    };

    get rotation() {
        return this.location.rotation;
    };

    get world() {
        return this.location.world;
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