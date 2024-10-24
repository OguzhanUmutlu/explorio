import {Server} from "../Server";

export interface CommandSender {
    server: Server;
    name: string;
    permissions: Set<string>;

    sendMessage(message: string): void;

    hasPermission(permission: string): boolean; // just use common Utils function permissionCheck
}