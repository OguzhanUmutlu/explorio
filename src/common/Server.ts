import World, {Generators, getRandomSeed, WorldMetaData, ZWorldMetaData} from "@/world/World";
import Player from "@/entity/defaults/Player";
import Command from "@/command/Command";
import CommandError from "@/command/CommandError";
import CommandSender, {CommandAs} from "@/command/CommandSender";
import {cleanText} from "@/command/CommandProcessor";
import SelectorToken from "@/command/token/SelectorToken";
import Location from "@/utils/Location";
import Entity from "@/entity/Entity";
import TeleportCommand from "@/command/defaults/TeleportCommand";
import {checkLag, ClassOf, SelectorSorters, setServer} from "@/utils/Utils";
import ListCommand from "@/command/defaults/ListCommand";
import ConsoleCommandSender from "@/command/ConsoleCommandSender";
import ExecuteCommand from "@/command/defaults/ExecuteCommand";
import Packet from "@/network/Packet";
import PermissionCommand from "@/command/defaults/PermissionCommand";
import Plugin, {PluginMetadata, ZPluginMetadata} from "@/plugin/Plugin";
import GameModeCommand from "@/command/defaults/GameModeCommand";
import EffectCommand from "@/command/defaults/EffectCommand";
import HelpCommand from "@/command/defaults/HelpCommand";
import {z} from "zod";
import ClearCommand from "@/command/defaults/ClearCommand";
import EventManager from "@/event/EventManager";
import PluginEvent from "@/event/PluginEvent";
import GiveCommand from "@/command/defaults/GiveCommand";
import PlayerSpamKickEvent from "@/event/defaults/PlayerSpamKickEvent";
import CommandPreProcessEvent from "@/event/defaults/CommandPreProcessEvent";
import PlayerMessagePreProcessEvent from "@/event/defaults/PlayerMessagePreProcessEvent";
import PlayerChatEvent from "@/event/defaults/PlayerChatEvent";
import BanEntry from "@/utils/BanEntry";
import KickCommand from "@/command/defaults/KickCommand";
import BanCommand from "@/command/defaults/BanCommand";
import BanIPCommand from "@/command/defaults/BanIPCommand";
import OperatorCommand from "@/command/defaults/OperatorCommand";
import DeOperatorCommand from "@/command/defaults/DeOperatorCommand";
import SayCommand from "@/command/defaults/SayCommand";

export const ZServerConfig = z.object({
    port: z.number().min(0).max(65535),
    renderDistance: z.number().min(0),
    defaultWorld: z.string().default("default"),
    defaultWorlds: z.record(z.string(), ZWorldMetaData),
    packetCompression: z.boolean(),
    maxMessageLength: z.number(),
    spamFilter: z.object({
        enabled: z.boolean(),
        threshold: z.number().min(0),
        seconds: z.number().min(0)
    }),
    saveIntervalSeconds: z.number().min(0)
});

export type ServerConfig = z.infer<typeof ZServerConfig>;
export type SingleEventHandler = [number, string, (e: PluginEvent) => unknown];
export type EventHandlersType = Map<ClassOf<PluginEvent>, SingleEventHandler[]>;

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
        enabled: false,
        threshold: 3,
        seconds: 5
    },
    saveIntervalSeconds: 45
};

const banEntryType = z.object({
    name: z.string(),
    ip: z.nullable(z.string().ip()),
    timestamp: z.number(),
    reason: z.string()
});

export default class Server {
    worlds: Record<string, World> = {};
    defaultWorld: World;
    players: Record<string, Player> = {};
    lastUpdate = Date.now() - 1;
    saveCounter = 0;
    commands: Record<string, Command> = {};
    sender: ConsoleCommandSender;
    config: ServerConfig;
    pluginMetas: Record<string, PluginMetadata> = {};
    plugins: Record<string, Plugin> = {};
    pluginsReady = false;
    intervalId: NodeJS.Timeout | number = 0;
    terminated = false;
    pausedUpdates = false;
    bans: BanEntry[] = [];

    constructor(public fs: typeof import("fs"), public path: string) {
        setServer(this);
    };

    deleteFile(path: string) {
        if (this.fileExists(path)) this.fs.rmSync(`${this.path}/${path}`, {recursive: true});
    };

    fileExists(path: string): boolean {
        return this.fs.existsSync(`${this.path}/${path}`);
    };

    createDirectory(path: string) {
        if (!this.fileExists(path)) this.fs.mkdirSync(`${this.path}/${path}`, {recursive: true, mode: 0o777});
    };

    writeFile(path: string, contents: Buffer | string) {
        this.fs.writeFileSync(`${this.path}/${path}`, contents);
    };

    readFile(path: string): Buffer | null {
        return this.fs.readFileSync(`${this.path}/${path}`);
    };

    readDirectory(path: string): string[] | null {
        return this.fs.readdirSync(`${this.path}/${path}`);
    };

    isClientSide() {
        return !this.fs;
    };

    init() {
        this.sender = new ConsoleCommandSender;
        this.intervalId = setInterval(() => {
            const now = Date.now();
            const dt = Math.min((now - this.lastUpdate) / 1000, 0.015);
            this.lastUpdate = now;
            this.update(dt);
        });

        for (const clazz of [
            HelpCommand,
            ListCommand,
            TeleportCommand,
            ExecuteCommand,
            PermissionCommand,
            GameModeCommand,
            EffectCommand,
            ClearCommand,
            GiveCommand,
            KickCommand,
            BanCommand,
            BanIPCommand,
            OperatorCommand,
            DeOperatorCommand,
            SayCommand
        ]) this.registerCommand(new clazz());

        this.createDirectory(this.path);

        this.loadConfig();

        this.createDirectory("players");
        this.createDirectory("worlds");
        this.createDirectory("plugins");

        if (!this.fileExists("bans.txt")) this.writeFile("bans.txt", "[]");

        try {
            for (const ban of JSON.parse(this.readFile("bans.txt").toString())) {
                if (!banEntryType.safeParse(ban).success) {
                    printer.error("Couldn't parse ban entry. Closing server... Please fix the ban entry or remove it. Entry: " + JSON.stringify(ban));
                    return this.close();
                }

                this.bans.push(new BanEntry(ban.name, ban.ip, ban.timestamp, ban.reason));
            }
        } catch (e) {
            printer.error("Couldn't parse ban file. Closing server... Please fix the JSON or remove the file.");
            return this.close();
        }

        this.loadPlugins().then(() => this.pluginsReady = true);

        for (const folder in this.config.defaultWorlds) {
            this.createWorld(folder, this.config.defaultWorlds[folder]);
        }

        for (const folder of this.readDirectory("worlds")) {
            if (this.loadWorld(folder)) printer.pass("Loaded world %c" + folder, "color: yellow");
            else printer.fail("Failed to load world %c" + folder, "color: yellow");
        }

        if (!(this.config.defaultWorld in this.worlds)) {
            printer.error("Default world couldn't be found. Please create the world named '" + this.config.defaultWorld + "'");
            return this.close();
        }

        this.defaultWorld = this.worlds[this.config.defaultWorld];
    };

    addBan(name: string, reason: string) {
        this.bans.push(new BanEntry(name, null, Date.now(), reason));
    };

    addIPBan(name: string, ip: string, reason: string) {
        this.bans.push(new BanEntry(name, ip, Date.now(), reason));
    };

    removeBan(name: string) {
        this.bans = this.bans.filter(b => b.name !== name);
    };

    removeIPBan(ip: string) {
        this.bans = this.bans.filter(b => b.ip !== ip);
    };

    loadConfig() {
        if (this.config) return;
        if (!this.fileExists("server.json")) {
            this.config ??= DefaultServerConfig;
            this.writeFile("server.json", JSON.stringify(this.config, null, 2));
            printer.warn("Created server.json, please edit it and restart the server");
            this.terminateProcess();
        } else {
            try {
                const got = JSON.parse(this.readFile("server.json").toString());
                ZServerConfig.parse(got);
                this.config = got;
            } catch (e) {
                printer.error(e);
                printer.warn("Invalid server.json, please edit it and restart the server");
                printer.info("Default config: ", JSON.stringify(DefaultServerConfig, null, 2));
                this.terminateProcess();
            }
        }
    };

    async loadPlugins() {
        const nonReadyPluginNames = new Set<string>;

        const url = await import(/* @vite-ignore */ "url");

        for (const folder of this.readDirectory("plugins")) {
            try {
                const meta = <PluginMetadata>JSON.parse(this.readFile(`plugins/${folder}/plugin.json`).toString());
                ZPluginMetadata.parse(meta);

                if (meta.name in this.pluginMetas) {
                    throw new Error("Duplicate plugin.");
                }

                this.pluginMetas[meta.name] = meta;
                const mainPath = `plugins/${folder}/${meta.main}`;
                const exp = await import(/* @vite-ignore */ url.pathToFileURL(mainPath).toString());
                if (!("default" in exp) || typeof exp.default !== "function") {
                    throw new Error("Plugin main file doesn't have a default function export.");
                }

                const plugin = this.plugins[meta.name] = <Plugin>new (exp.default)(this, meta);

                if (!(plugin instanceof Plugin)) {
                    throw new Error("Plugin main file doesn't export a Plugin class.");
                }

                plugin.onLoad();
                this.registerEvents(plugin);

                nonReadyPluginNames.add(meta.name);
            } catch (e) {
                printer.error("Failed to load plugin %c" + folder, "color: yellow");
                printer.error(e);
                printer.error("Closing the server for plugin integrity.");
                this.close();
            }
        }

        while (nonReadyPluginNames.size > 0) {
            let loadedAny = false;
            for (const name of Array.from(nonReadyPluginNames)) {
                const meta = this.pluginMetas[name];
                const plugin = this.plugins[name];
                try {
                    if (meta.dependencies && meta.dependencies.some(n => nonReadyPluginNames.has(n))) continue;
                    loadedAny = true;
                    plugin.onEnable();
                    nonReadyPluginNames.delete(name);
                } catch (e) {
                    printer.error("Failed to load plugin %c" + meta.name, "color: yellow");
                    printer.error(e);
                }
            }
            if (!loadedAny) {
                printer.error(`Circular dependencies detected in the plugins: ${Array.from(nonReadyPluginNames).join(", ")}. Closing the server for plugin integrity.`);
                this.close();
            }
        }
    };

    registerEvents(clazz: Plugin) {
        const origin = (<typeof Plugin>clazz.constructor)._eventHandlers ??= <EventHandlersType>new Map;
        const newMap = clazz._eventHandlers ??= <EventHandlersType>new Map;
        for (const [ev, handlers] of origin) {
            const list = <SingleEventHandler[]>[];
            for (const handler of handlers) {
                const fn = clazz[handler[1]].bind(clazz);
                list.push([handler[0], handler[1], fn]);
                EventManager.on(ev, fn, handler[0]);
            }
            newMap.set(ev, list);
        }
    };

    unregisterEvents(clazz: Plugin) {
        const list = clazz._eventHandlers ??= <EventHandlersType>new Map;
        for (const [ev, handlers] of list) {
            for (const handler of handlers) {
                EventManager.off(ev, handler[2]);
            }
        }

        clazz._eventHandlers = new Map;
    };

    disablePlugin(plugin: Plugin) {
        this.unregisterEvents(plugin);
        plugin.onDisable();
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
                entities = Array.from(at.world.getChunkEntitiesAt(at.x));
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
            const val = token.value;
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
                case "id":
                    if (token.type === "range") {
                        entities = entities.filter(entity => bm - +(entity.id <= val[1] && entity.id >= val[0]));
                    } else if (token.type === "number") {
                        entities = entities.filter(entity => bm - +(entity.id === val));
                    } else throw new CommandError(`Invalid 'id' attribute for the selector`);
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
                        return bm - +(entity.tags.has(<string>val));
                    });
                    break;
                case "nbt":
                    if (token.type !== "object") throw new CommandError(`Invalid 'nbt' attribute for the selector`);

                    entities = entities.filter(entity => {
                        const allow = entity.struct.keys();
                        for (const k in <object>val) {
                            if (!allow.includes(<never>k)) return false;
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
                    if (token.type !== "array" || (<unknown[]>val).some((i: unknown) => typeof i !== "string")) {
                        throw new CommandError(`Invalid 'permissions' attribute for the selector`);
                    }

                    entities = entities.filter(entity => {
                        return bm - +(entity instanceof Player && (<unknown[]>val).every((perm: string) => entity.hasPermission(perm)));
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
        return this.fileExists("worlds/" + folder);
    };

    getWorldData(folder: string): WorldMetaData | null {
        const path = "worlds/" + folder + "/world.json";
        if (!this.fileExists(path)) return null;

        const buf = this.readFile(path);
        try {
            const conf = JSON.parse(buf.toString())
            ZWorldMetaData.parse(conf);
            return conf;
        } catch (e) {
            printer.error("World " + folder + " has an invalid world.json file");
            printer.error(e);
            return null;
        }
    };

    getWorldChunkList(folder: string): number[] | null {
        const worldPath = "worlds/" + folder;
        if (!this.fileExists(worldPath)) return null;
        const chunksPath = "worlds/" + folder + "/chunks";
        this.createDirectory(chunksPath);
        return (this.readDirectory(chunksPath)).map(file => parseInt(file.split(".")[0]));
    };

    loadWorld(folder: string): World | null {
        const data = this.getWorldData(folder);
        if (!data) return null;
        const gen = Generators[data.generator];
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
        this.createDirectory("worlds/" + folder);
        this.createDirectory("worlds/" + folder + "/chunks");
        this.writeFile("worlds/" + folder + "/world.json", JSON.stringify(data, null, 2));
        return true;
    };


    update(dt: number) {
        if (this.pausedUpdates) return;
        checkLag("server update", 10);

        for (const folder in this.worlds) {
            this.worlds[folder].serverUpdate(dt);
        }

        this.saveCounter += dt;
        if (this.saveCounter > this.config.saveIntervalSeconds) {
            this.saveWorlds();
            this.saveCounter = 0;
        }

        checkLag("server update");
    };

    broadcastPacket(pk: Packet, exclude: Entity[] = [], immediate = false) {
        for (const name in this.players) {
            const player = this.players[name];
            if (!exclude.includes(player)) player.sendPacket(pk, immediate);
        }
    };

    broadcastMessage(message: string) {
        for (const name in this.players) {
            const player = this.players[name];
            player.sendMessage(message);
        }
        printer.info(message);
    };

    processChat(sender: CommandSender, message: string) {
        if (sender instanceof Player) {
            const ev = new PlayerChatEvent(sender, message);
            ev.call();
            if (ev.cancelled) return;
            message = ev.message;
        }

        this.broadcastMessage(sender.name + " > " + message);
    };

    executeCommandLabel(sender: CommandSender, as: CommandAs, at: Location, label: string) {
        const split = label.split(" ");
        const commandLabel = split[0].toLowerCase();
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

    processMessage(player: Player, message: string) {
        message = cleanText(message).substring(0, this.config.maxMessageLength);
        if (!message) return;

        if (this.config.spamFilter.enabled) {
            player.messageTimes = player.messageTimes.filter(i => i + 1000 * this.config.spamFilter.seconds > Date.now());
            player.messageTimes.push(Date.now());
            if (player.messageTimes.length > this.config.spamFilter.threshold) {
                const ev = new PlayerSpamKickEvent(player);
                if (!ev.callGetCancel()) return player.kick(ev.kickMessage);
            }
        }

        const ev = new PlayerMessagePreProcessEvent(player, message);
        ev.call();
        if (ev.cancelled) return;
        message = ev.message;

        if (message[0] === "/") {
            if (!new CommandPreProcessEvent(player, message).callGetCancel()) this.executeCommandLabel(
                player,
                player,
                player instanceof Entity ? (<Entity>player).location : new Location(0, 0, 0, this.defaultWorld),
                message.substring(1)
            );
        } else this.processChat(player, message);
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

    saveBans() {
        this.writeFile("bans.json", JSON.stringify(this.bans.map(i => ({
            name: i.name,
            ip: i.ip,
            timestamp: i.timestamp,
            reason: i.reason
        })), null, 2));
    };

    saveAll() {
        this.saveWorlds();
        this.savePlayers();
        this.saveBans();
    };

    close() {
        if (this.terminated) return;

        printer.info("Closing the server...");

        printer.info("Kicking players...");
        for (const playerName in this.players) {
            const player = this.players[playerName];
            player.kick("Server closed");
            player.network.onClose();
        }

        printer.info("Saving the worlds...");
        this.saveWorlds();

        this.saveBans();

        this.terminated = true;
        setTimeout(() => this.terminateProcess(), 1000); // making sure every player gets the kick message
    };

    terminateProcess() {
        this.terminated = true;
        clearInterval(this.intervalId);
        if (typeof process === "object") process.exit();
    };
}