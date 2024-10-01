export interface CommandSender {
    name: string;

    sendMessage(message: string): void;
}