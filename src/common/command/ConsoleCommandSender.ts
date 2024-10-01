import {CommandSender} from "./CommandSender";

export class ConsoleCommandSender implements CommandSender {
    name = "CONSOLE";

    sendMessage(message: string): void {
        printer.info(message);
    };
}