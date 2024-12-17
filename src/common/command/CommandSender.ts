import Server from "@/Server";
import Entity from "@/entity/Entity";
import Location from "@/utils/Location";

export type CommandAs = Entity | CommandSender;

export default interface CommandSender {
    id: number
    server: Server;
    name: string;
    permissions: Set<string>;
    location: Location;

    get x(): number;
    get y(): number;
    get rotation(): number;
    get world(): this["location"]["world"];

    sendMessage(message: string): void;

    hasPermission(permission: string): boolean; // just use common Utils function permissionCheck

    chat(message: string): void;
}