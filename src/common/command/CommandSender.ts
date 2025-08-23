import {Server} from "@/Server";

import {Position} from "@/utils/Position";
import {Entity} from "@/entity/Entity";

export type CommandAs = Entity | CommandSender;

export interface CommandSender extends Position {
    id: number
    server: Server;
    name: string;
    permissions: Set<string>;

    sendMessage(message: string): void;

    hasPermission(permission: string): boolean; // just use common Utils function permissionCheck
}