import {Generators, getRandomSeed, World, WorldMetaData} from "./world/World";
import {Player} from "./entity/types/Player";
import {Command, CommandError} from "./command/Command";
import {CommandAs, CommandSender} from "./command/CommandSender";
import {cleanText, SelectorToken} from "./command/CommandProcessor";
import {Location} from "./utils/Location";
import {Entity} from "./entity/Entity";
import {TeleportCommand} from "./command/defaults/TeleportCommand";
import {checkLag, SelectorSorters, setServer} from "./utils/Utils";
import {ListCommand} from "./command/defaults/ListCommand";
import {ConsoleCommandSender} from "./command/ConsoleCommandSender";
import {ExecuteCommand} from "./command/defaults/ExecuteCommand";
import {Packet} from "./network/Packet";
import {PermissionCommand} from "./command/defaults/PermissionCommand";
import {Packets} from "./network/Packets";

export type ServerConfig = {
    port: number,
    renderDistance: number,
    defaultWorld: string,
    defaultWorlds: Record<string, WorldMetaData>,
    packetCompression: boolean,
    maxMessageLength: number,
    spamFilter: {
        enabled: boolean,
        threshold: number,
        seconds: number
    }
};

export const DefaultServerConfig: ServerConfig = {
    port: 1881,
    renderDistance: 3,
    defaultWorld: "default",
    defaultWorlds: {
        default: {
            name: "default",
            generator: "default",
            generatorOptions: "",
            seed: getRandomSeed()
        }
    },
    packetCompression: false,
    maxMessageLength: 256,
    spamFilter: {
        enabled: true,
        threshold: 3,
        seconds: 5
    }
};

export class Server {
    worlds: Record<string, World> = {};
    defaultWorld: World;
    players: Record<string, Player> = {};
    lastUpdate = Date.now() - 1;
    saveCounter = 0;
    saveCounterMax = 45;
    commands: Record<string, Command> = {};
    sender: ConsoleCommandSender;
    config: ServerConfig;

    constructor(public fs: typeof import("fs"), public path: string) {
        setServer(this);
    };

    deleteFile(path: string) {
        this.fs.rmSync(path);
    };

    fileExists(path: string): boolean {
        return this.fs.existsSync(path);
    };

    createDirectory(path: string) {
        if (!this.fileExists(path)) this.fs.mkdirSync(path, {recursive: true, mode: 0o777});
    };

    writeFile(path: string, contents: any) {
        this.fs.writeFileSync(path, contents);
    };

    readFile(path: string): Buffer | null {
        return this.fs.readFileSync(path);
    };

    readDirectory(path: string): string[] | null {
        return this.fs.readdirSync(path);
    };

    isClientSide() {
        return !this.fs;
    };

    init() {
        this.sender = new ConsoleCommandSender;
        setInterval(() => {
            const now = Date.now();
            const dt = Math.min((now - this.lastUpdate) / 1000, 0.015);
            this.lastUpdate = now;
            this.update(dt);
        });

        for (const clazz of [
            ListCommand,
            TeleportCommand,
            ExecuteCommand,
            PermissionCommand
        ]) this.registerCommand(new clazz());

        if (!this.fileExists(this.path)) this.createDirectory(this.path);

        this.loadConfig();
        if (!this.fileExists(`${this.path}/worlds`)) this.createDirectory(`${this.path}/worlds`);
        for (const folder in this.config.defaultWorlds) {
            this.createWorld(folder, this.config.defaultWorlds[folder]);
        }
        for (const folder of this.getWorldFolders()) {
            if (this.loadWorld(folder)) printer.pass("Loaded world %c" + folder, "color: yellow");
            else printer.fail("Failed to load world %c" + folder, "color: yellow");
        }
        if (!(this.config.defaultWorld in this.worlds)) {
            printer.error("Default world couldn't be found. Please create the world named '" + this.config.defaultWorld + "'");
            this.close();
        }
        this.defaultWorld = this.worlds[this.config.defaultWorld];
    };

    loadConfig() {
        if (this.config) return;
        if (!this.fileExists(`${this.path}/server.json`)) {
            this.config ??= DefaultServerConfig;
            this.writeFile(`${this.path}/server.json`, JSON.stringify(this.config, null, 2));
            printer.warn("Created server.json, please edit it and restart the server");
            process.exit(0);
        } else {
            const buf = this.readFile(`${this.path}/server.json`);
            this.config ??= {...(this.config ?? {}), ...JSON.parse(buf.toString())};
        }
    };

    getAllEntities() {
        const entities: Entity[] = [];
        for (const world in this.worlds) {
            entities.push(...Object.values(this.worlds[world].entities));
        }
        return entities;
    };

    executeSelector(as: CommandAs, at: Location, selector: SelectorToken) {
        let entities: Entity[];

        switch (selector.value) {
            case "a":
                entities = Object.values(this.players);
                break;
            case "p":
                if (as instanceof Player) entities = [as];
                else {
                    let player: Player;
                    let distance = Infinity;
                    for (const pName in this.players) {
                        const p = this.players[pName];
                        const dist = p.distance(at.x, at.y);
                        if (dist < distance) {
                            distance = dist;
                            player = p;
                        }
                    }
                    entities = player ? [player] : [];
                }
                break;
            case "s":
                entities = as instanceof Entity ? [as] : [];
                break;
            case "e":
                entities = this.getAllEntities();
                break;
            case "c":
                entities = at.world.getChunkEntitiesAt(at.x);
                break;
        }

        if ("sort" in selector.filters) {
            const token = selector.filters.sort;
            const val = <string>token.value;

            if (token.type !== "text") throw new CommandError(`Invalid 'sort' attribute for the selector`);
            if (val in SelectorSorters) {
                entities.sort((a, b) => SelectorSorters[val](a, b, at));
            } else throw new CommandError(`Invalid 'sort' attribute for the selector`);
        }

        for (const k in selector.filters) {
            const token = selector.filters[k];
            const val = <any>token.value;
            const bm = 1 - token.yes;
            switch (k) {
                case "x":
                case "y":
                    if (token.type === "range") {
                        entities.filter(entity => bm - +(entity[k] <= val[1] && entity[k] >= val[0]));
                    } else if (token.type === "number") {
                        entities.filter(entity => bm - +(entity[k] === val));
                    } else throw new CommandError(`Invalid '${k}' attribute for the selector`);
                    break;
                case "distance":
                    if (token.type === "range") entities = entities.filter(i => {
                        const dist = i.distance(at.x, at.y);
                        return bm - +(dist <= val[1] && dist >= val[0]);
                    }); else if (token.type === "number") {
                        entities = entities.filter(entity => {
                            return bm - +(entity.distance(at.x, at.y) === val);
                        });
                    } else throw new CommandError("Invalid 'distance' attribute for the selector");
                    break;
                case "dx":
                case "dy":
                    if (token.type === "range") {
                        entities = entities.filter(entity => {
                            return bm - +(entity[k] - at[k] <= val[1] && entity[k] - at[k] >= val[0]);
                        });
                    } else if (token.type === "number") {
                        entities = entities.filter(entity => {
                            return bm - +(entity[k] - at[k] === val);
                        });
                    } else throw new CommandError(`Invalid '${k}' attribute for the selector`);
                    break;
                case "rotation":
                    if (token.type === "range") {
                        entities = entities.filter(entity => {
                            return bm - +(entity.rotation - at.rotation <= val[1] && entity.rotation - at.rotation >= val[0]);
                        });
                    } else if (token.type === "number") {
                        entities = entities.filter(entity => {
                            return bm - +(entity.rotation - at.rotation === val);
                        });
                    } else throw new CommandError(`Invalid 'rotation' attribute for the selector`);
                    break;
                case "tag":
                    if (token.type !== "text") {
                        throw new CommandError(`Invalid 'tag' attribute for the selector`);
                    }

                    entities = entities.filter(entity => {
                        return bm - +(entity.tags.has(val));
                    });
                    break;
                case "nbt":
                    if (token.type !== "object") throw new CommandError(`Invalid 'nbt' attribute for the selector`);

                    entities = entities.filter(entity => {
                        for (const k in val) {
                            if (!entity.struct.keys().includes(k)) return false;
                            if (!val[k].equalsValue(entity[k])) return false;
                        }
                        return bm - +token.equalsValue(entity);
                    });
                    break;
                case "type":
                    if (token.type !== "text") throw new CommandError(`Invalid 'type' attribute for the selector`);

                    entities = entities.filter(entity => {
                        return bm - +(entity.typeName === val);
                    });
                    break;
                case "name":
                    if (token.type !== "text") throw new CommandError(`Invalid 'name' attribute for the selector`);

                    entities = entities.filter(entity => {
                        return bm - +(entity.name === val);
                    });
                    break;
                case "world":
                    if (token.type !== "text") throw new CommandError(`Invalid 'world' attribute for the selector`);

                    entities = entities.filter(entity => {
                        return bm - +(entity.world.folder === val);
                    });
                    break;
                case "permissions":
                    if (token.type !== "array" || val.some((i: any) => typeof i !== "string")) {
                        throw new CommandError(`Invalid 'permissions' attribute for the selector`);
                    }

                    entities = entities.filter(entity => {
                        return bm - +(entity instanceof Player && val.every((perm: string) => entity.hasPermission(perm)));
                    });
                    break;
                case "limit":
                case "sort":
                    break;
                default:
                    throw new CommandError(`Invalid '${k}' attribute for the selector`);
            }
        }

        if ("limit" in selector.filters) {
            const token = selector.filters.limit;
            if (token.type !== "number") throw new CommandError(`Invalid 'limit' attribute for the selector`);
            const val = Math.floor(+token.value);
            if (val < 0) throw new CommandError(`Invalid 'limit' attribute for the selector`);
            entities = entities.slice(0, val);
        }

        return entities;
    };

    worldExists(folder: string): boolean {
        return this.fileExists(this.path + "/worlds/" + folder);
    };

    getWorldData(folder: string): WorldMetaData | null {
        const path = this.path + "/worlds/" + folder + "/world.json";
        if (!this.fileExists(path)) return null;

        const buf = this.readFile(path);
        return JSON.parse(buf.toString());
    };

    getWorldChunkList(folder: string): number[] | null {
        const worldPath = this.path + "/worlds/" + folder;
        if (!this.fileExists(worldPath)) return null;
        const chunksPath = this.path + "/worlds/" + folder + "/chunks";
        if (!this.fileExists(chunksPath)) this.createDirectory(chunksPath);
        return (this.readDirectory(chunksPath)).map(file => parseInt(file.split(".")[0]));
    };

    getWorldFolders(): string[] {
        return this.readDirectory(this.path + "/worlds");
    };

    loadWorld(folder: string): World | null {
        const data = this.getWorldData(folder);
        if (!data) return null;
        const gen = <any>Generators[data.generator];
        const world = new World(
            this, data.name, folder, data.seed, new gen(data.generatorOptions),
            new Set(this.getWorldChunkList(folder))
        );
        this.worlds[folder] = world;
        world.ensureSpawnChunks();
        return world;
    };

    createWorld(folder: string, data: WorldMetaData): boolean {
        if (this.worldExists(folder)) return false;
        this.createDirectory(this.path + "/worlds/" + folder);
        this.createDirectory(this.path + "/worlds/" + folder + "/chunks");
        this.writeFile(this.path + "/worlds/" + folder + "/world.json", JSON.stringify(data, null, 2));
        return true;
    };

    update(dt: number) {
        checkLag("server");
        for (const folder in this.worlds) {
            this.worlds[folder].serverUpdate(dt);
        }
        this.saveCounter += dt;
        if (this.saveCounter > this.saveCounterMax) {
            this.save();
            this.saveCounter = 0;
        }

        for (const name in this.players) {
            const player = this.players[name];
            player.network.releaseBatch();
        }
        checkLag("server");
    };

    broadcastPacket(pk: Packet, exclude: Player[] = [], immediate = false) {
        for (const name in this.players) {
            const player = this.players[name];
            if (!exclude.includes(player)) player.network.sendPacket(pk, immediate);
        }
    };

    broadcastMessage(message: string) {
        this.broadcastPacket(new Packets.SendMessage(message));
        printer.info(message);
    };

    processChat(sender: CommandSender, message: string) {
        this.broadcastMessage(sender.name + " > " + message);
    };

    executeCommandLabel(sender: CommandSender, as: CommandAs, at: Location, label: string) {
        const split = label.split(" ");
        const commandLabel = split[0];
        const command = this.commands[commandLabel];
        if (!command) {
            sender.sendMessage(`§cUnknown command: ${commandLabel}. Type /help for a list of commands`);
            return;
        }
        const args = split.slice(1);
        try {
            if (command.permission && !sender.hasPermission(command.permission)) {
                sender.sendMessage(`§cYou don't have permission to execute this command.`);
                return;
            }

            return command.execute(sender, as, at, args, label);
        } catch (e) {
            if (e instanceof CommandError) {
                sender.sendMessage(`§c${e.message}`);
            } else {
                printer.error(e);
                if (as instanceof Player) as.kick("§cAn error occurred while executing this command.");
            }
        }
        return Error;
    };

    processMessage(sender: CommandSender, message: string) {
        if (this.config.spamFilter.enabled && sender instanceof Player) {
            sender.messageTimes = sender.messageTimes.filter(i => i + 1000 * this.config.spamFilter.seconds > Date.now());
            sender.messageTimes.push(Date.now());
            if (sender.messageTimes.length > this.config.spamFilter.threshold) {
                sender.kick("Kicked for spam");
            }
        }
        message = cleanText(message).substring(0, this.config.maxMessageLength);
        if (message[0] === "/") {
            this.executeCommandLabel(
                sender,
                sender,
                sender instanceof Entity ? (<any>sender).location : new Location(0, 0, 0, this.defaultWorld),
                message.substring(1)
            );
        } else this.processChat(sender, message);
    };

    registerCommand(command: Command) {
        this.commands[command.name] = command;
        for (const alias of command.aliases) {
            this.commands[alias] = command;
        }
        command.init();
    };

    saveWorlds() {
        for (const folder in this.worlds) {
            this.worlds[folder].save();
        }
    };

    savePlayers() {
        for (const player in this.players) {
            this.players[player].save();
        }
    };

    save() {
        this.saveWorlds();
        this.savePlayers();
    };

    close() {
        printer.info("Closing the server...");

        printer.info("Kicking players...");
        for (const player in this.players) {
            this.players[player].kick("Server closed");
        }

        printer.info("Saving the server...");
        this.saveWorlds();

        this.terminateProcess();
    };

    terminateProcess() {
        if (typeof process === "object") process.exit();
    };
}