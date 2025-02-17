import Server from "@/Server";
import Entity from "@/entity/Entity";
import Location from "@/utils/Location";

export type CommandAs = Entity | CommandSender;

export default interface CommandSender extends Location {
    id: number
    server: Server;
    name: string;
    permissions: Set<string>;

    sendMessage(message: string): void;

    hasPermission(permission: string): boolean; // just use common Utils function permissionCheck

    chat(message: string): void;
}