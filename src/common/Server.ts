import {World, WorldMetaData} from "./world/World";
import {Player} from "./entity/types/Player";
import {Command, CommandError, CommandSuccess} from "./command/Command";
import {CommandSender} from "./command/CommandSender";
import {cleanText, splitParameters} from "./command/CommandProcessor";
import {RotatedPosition} from "./utils/RotatedPosition";
import {Entity} from "./entity/Entity";
import {TeleportCommand} from "./command/defaults/TeleportCommand";

export type PlayerData = {
    x: number,
    y: number,
    spawnX: number,
    spawnY: number,
    world: string
};

export abstract class Server<WorldType extends World = World, PlayerType extends Player<WorldType> = Player<WorldType>> {
    __player_type__: PlayerType;
    operators: string[];

    worlds: Record<string, WorldType> = {};
    defaultWorld: WorldType;
    players: Set<PlayerType> = new Set;
    lastUpdate = Date.now() - 1;
    saveCounter = 0;
    commands: Record<string, Command> = {};

    init() {
        setInterval(() => {
            const now = Date.now();
            const dt = Math.min((now - this.lastUpdate) / 1000, 0.015);
            this.lastUpdate = now;
            this.update(dt);
        });

        for (const clazz of [
            TeleportCommand
        ]) this.registerCommand(new clazz());
    };

    abstract worldExists(folder: string): boolean;

    abstract getWorldData(folder: string): WorldMetaData | null;

    abstract getWorldChunkList(folder: string): number[] | null;

    abstract getWorldFolders(): string[];

    abstract loadWorld(folder: string): WorldType | null;

    abstract createWorld(folder: string, data: WorldMetaData): boolean;

    abstract close(): void;

    update(dt: number) {
        for (const folder in this.worlds) {
            this.worlds[folder].serverUpdate(dt);
        }
        this.saveCounter += dt;
        if (this.saveCounter > 5) {
            this.save();
            this.saveCounter = 0;
        }
    };

    save() {
        for (const folder in this.worlds) {
            this.worlds[folder].save();
        }
    };

    abstract broadcastMessage(message: string): void;

    processChat(sender: CommandSender, message: string) {
        this.broadcastMessage(sender.name + " > " + message);
    };

    executeCommandLabel(source: CommandSender, as: CommandSender[], at: RotatedPosition, label: string) {
        const split = label.split(" ");
        const commandLabel = split[0];
        const command = this.commands[commandLabel];
        if (!command) {
            source.sendMessage(`Unknown command: ${commandLabel}. Type /help for a list of commands`);
            return;
        }
        const params = split.slice(1).join(" "); // todo: command definition permissions. argument required and spread
        const args = splitParameters(params);
        try {
            const exec = command.define(source, args, params);
            if (command.permission && !source.hasPermission(command.permission)) {
                source.sendMessage(`§cYou don't have permission to execute this command.`);
                return;
            }

            let fail = 0;
            let exec0 = exec;
            for (const s of as) {
                if (!(exec0 = (<any>exec).run(source, s, at, ...args))) fail++;
            }

            if (fail && as.length > 1) {
                source.sendMessage(`§cFailed to execute the command for ${fail} targets.`);
            }

            if (as.length === 1 && exec0 instanceof CommandSuccess) {
                source.sendMessage(`§a${exec0.message}`);
            }
        } catch (e) {
            if (e instanceof CommandError) {
                source.sendMessage(`§c${e.message}`);
            } else {
                printer.error(e);
                if (as instanceof Player) as.kick();
            }
        }
    };

    processMessage(sender: CommandSender, message: string) {
        message = cleanText(message);
        if (message[0] === "/") {
            this.executeCommandLabel(sender, [sender], sender instanceof Entity ? sender.position : new RotatedPosition(0, 0, 0), message.substring(1));
        } else this.processChat(sender, message);
    };

    registerCommand(command: Command) {
        this.commands[command.name] = command;
        for (const alias of command.aliases) {
            this.commands[alias] = command;
        }
    };
}