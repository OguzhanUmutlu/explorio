import World, {Generators, getRandomSeed, WorldMetaData, ZWorldMetaData} from "@/world/World";
import Player from "@/entity/defaults/Player";
import CommandError from "@/command/CommandError";
import CommandSender, {CommandAs} from "@/command/CommandSender";
import {cleanText} from "@/command/CommandProcessor";
import SelectorToken from "@/command/token/SelectorToken";
import Position from "@/utils/Position";

import TeleportCommand from "@/command/defaults/TeleportCommand";
import {
    ClassOf,
    SelectorSorters,
    setServer,
    suggestString,
    zstdOptionalDecode,
    zstdOptionalEncode
} from "@/utils/Utils";
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
import {LanguageName, Languages} from "@/lang/Language";
import SummonCommand from "@/command/defaults/SummonCommand";
import Entity from "@/entity/Entity";
import TickCommand from "@/command/defaults/TickCommand";
import GameRuleCommand from "@/command/defaults/GameRuleCommand";
import DataCommand from "@/command/defaults/DataCommand";
import X from "stramp";
import {Version, Versions, VersionString, WorldGenerationVersion} from "@/Versions";
import KillCommand from "@/command/defaults/KillCommand";
import Effect from "@/effect/Effect";
import Tile from "@/tile/Tile";
import Command from "@/command/Command";
import FallingBlockEntity from "@/entity/defaults/FallingBlockEntity";
import ItemEntity from "@/entity/defaults/ItemEntity";
import XPOrbEntity from "@/entity/defaults/XPOrbEntity";
import ChestTile from "@/tile/defaults/ChestTile";
import FurnaceTile from "@/tile/defaults/FurnaceTile";
import FireResistanceEffect from "@/effect/defaults/FireResistanceEffect";
import ResistanceEffect from "@/effect/defaults/ResistanceEffect";
import SlownessEffect from "@/effect/defaults/SlownessEffect";
import SpeedEffect from "@/effect/defaults/SpeedEffect";
import ItemFactory from "@/item/ItemFactory";
import Interval from "@/utils/Interval";
import Timeout from "@/utils/Timeout";

export const ZServerConfig = z.object({
    port: z.number().min(0).max(65535),
    maxPlayers: z.number().int().min(-1).max(4294967295), // -1 or 4294967295 means unlimited
    renderDistance: z.number().min(0),
    language: z.enum(<[LanguageName, ...LanguageName[]]>Object.keys(Languages)),
    motd: z.string(),
    defaultWorld: z.string().default("default"),
    defaultWorlds: z.record(z.string(), ZWorldMetaData),
    packetCompression: z.boolean(),
    maxMessageLength: z.number(),
    spamFilter: z.object({
        enabled: z.boolean(),
        threshold: z.number().min(0),
        seconds: z.number().min(0)
    }),
    saveIntervalTicks: z.number().min(0),
    auth: z.string().nullable().optional()
});

export type ServerConfig = z.infer<typeof ZServerConfig>;
export type SingleEventHandler = [number, string, (e: PluginEvent) => unknown];
export type EventHandlersType = Map<ClassOf<PluginEvent>, SingleEventHandler[]>;

export const DefaultServerConfig: ServerConfig = {
    port: 1881,
    maxPlayers: 20,
    renderDistance: 3,
    language: "en",
    motd: "My Server",
    defaultWorld: "default",
    defaultWorlds: {
        default: {
            name: "default",
            generator: "default",
            generatorOptions: "",
            seed: getRandomSeed(),
            gameRules: {
                randomTickSpeed: 3
            }
        }
    },
    packetCompression: false,
    maxMessageLength: 256,
    spamFilter: {
        enabled: false,
        threshold: 3,
        seconds: 5
    },
    saveIntervalTicks: 900,
    auth: null // "https://127.0.0.1/"
};

const banEntryType = z.object({
    name: z.string(),
    ip: z.nullable(z.string().ip()),
    timestamp: z.number(),
    reason: z.string()
});

export type StorageDataValue = string | number | boolean | null | { [key: string]: StorageDataValue };
export type StorageData = { [key: string]: StorageDataValue };

interface ServerFS {
    existsSync(path: string): boolean;
    mkdirSync(path: string, options?: { recursive?: boolean; mode?: number }): void;
    rmSync(path: string, options?: { recursive?: boolean }): void;
    writeFileSync(path: string, data: Buffer | string): void;
    readFileSync(path: string): Buffer;
    readdirSync(path: string): string[];
}

export default class Server {
    worlds: Record<string, World> = {};
    defaultWorld: World;
    players: Record<string, Player> = {};
    lastUpdate = Date.now() - 1;
    saveCounter = 0;
    sender: ConsoleCommandSender;
    config: ServerConfig;
    pluginMetas: Record<string, PluginMetadata> = {};
    plugins: Record<string, Plugin> = {};
    pluginsReady = false;
    intervalId: NodeJS.Timeout | number = 0;
    pausedUpdates = false;
    bans: BanEntry[] = [];
    targetTickRate = 20;
    ticks = 0;
    tickRate = 20;
    tickAccumulator = 0;
    _ticksLastSecond: number[] = [];
    tickFrozen = false;
    tickNow = 0;
    stepTicks = 0;
    storage: StorageData = {};
    closed = false;
    closeReason = "";
    terminalHistory: string[] = [];
    tickCooldown = 0;

    entityNameToId: Record<string, number> = {};
    entityIdToName = <Record<number, string>>{};
    registeredEntities = <Record<number, ClassOf<Entity>>>{};

    tileNameToId: Record<string, number> = {};
    tileIdToName = <Record<number, string>>{};
    registeredTiles = <Record<number, ClassOf<Tile>>>{};

    commands: Record<string, Command> = {};

    effectNameToId: Record<string, number> = {};
    registeredEffects = <Record<number, Effect>>{};

    defaultCommandClasses = [
        HelpCommand, ListCommand, TeleportCommand, ExecuteCommand, PermissionCommand, GameModeCommand,
        EffectCommand, ClearCommand, GiveCommand, KickCommand, BanCommand, BanIPCommand, OperatorCommand,
        DeOperatorCommand, SayCommand, SummonCommand, TickCommand, GameRuleCommand, DataCommand, KillCommand
    ];
    defaultEntityClasses = [
        Player, FallingBlockEntity, ItemEntity, XPOrbEntity
    ];
    defaultTileClasses = [
        ChestTile, FurnaceTile
    ];
    defaultEffectClasses = [
        FireResistanceEffect, ResistanceEffect, SlownessEffect, SpeedEffect
    ];

    itemFactory = new ItemFactory();

    timeouts = new Map<number, Set<Timeout>>;
    intervals = new Set<Interval>;

    constructor(public fs: ServerFS, public path: string, public socketServer: { close(): void } = null) {
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

    registerDefaults() {
        for (const clazz of this.defaultCommandClasses) this.registerCommand(new clazz());
        for (const clazz of this.defaultEntityClasses) this.registerEntity(new clazz());
        for (const clazz of this.defaultTileClasses) this.registerTile(new clazz());
        for (const clazz of this.defaultEffectClasses) this.registerEffect(new clazz());
        this.itemFactory.initDefaultItems();
    };

    init() {
        this.sender = new ConsoleCommandSender;
        this.intervalId = setInterval(() => {
            const now = Date.now();
            const dt = Math.min((now - this.lastUpdate) / 1000, 0.015);
            this.lastUpdate = now;
            this.update(dt);
        });

        this.registerDefaults();

        this.createDirectory(this.path);

        this.loadConfig();
        if (this.closed) return;

        this.loadStorage();

        this.createDirectory("players");
        this.createDirectory("worlds");
        this.createDirectory("plugins");
        this.createDirectory("crashdumps");

        if (!this.fileExists("bans.json")) this.writeFile("bans.json", "[]");

        try {
            for (const ban of JSON.parse(this.readFile("bans.json").toString())) {
                if (!banEntryType.safeParse(ban).success) {
                    return this.close("Couldn't parse ban entry. Closing server... Please fix the ban entry or remove it. Entry: " + JSON.stringify(ban));
                }

                this.bans.push(new BanEntry(ban.name, ban.ip, ban.timestamp, ban.reason));
            }
        } catch {
            return this.close("Couldn't parse ban file. Closing server... Please fix the JSON or remove the file.");
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
            return this.close("Default world couldn't be found. Please create the world named '" + this.config.defaultWorld + "'");
        }

        this.defaultWorld = this.worlds[this.config.defaultWorld];
    };

    registerEntity(sample: Entity) {
        if (this.registeredEntities[sample.typeId]) {
            throw new Error(`Entity type ID ${sample.typeId} is already registered.`);
        }

        this.registeredEntities[sample.typeId] = sample.constructor as ClassOf<Entity>;
        this.entityNameToId[sample.typeName] = sample.typeId;
        this.entityIdToName[sample.typeId] = sample.typeName;
    };

    registerTile(sample: Tile) {
        if (this.registeredTiles[sample.typeId]) {
            throw new Error(`Tile type ID ${sample.typeId} is already registered.`);
        }

        this.registeredTiles[sample.typeId] = sample.constructor as ClassOf<Tile>;
        this.tileNameToId[sample.typeName] = sample.typeId;
        this.tileIdToName[sample.typeId] = sample.typeName;
    };

    registerEffect(sample: Effect) {
        if (this.registeredEffects[sample.typeId]) {
            throw new Error(`Effect type ID ${sample.typeId} is already registered.`);
        }

        this.registeredEffects[sample.typeId] = sample;
        this.effectNameToId[sample.typeName] = sample.typeId;
    };

    registerCommand(command: Command) {
        this.commands[command.name] = command;
        for (const alias of command.aliases) {
            this.commands[alias] = command;
        }
        command.init();
    };

    afterFunc(ticks: number, callback: () => void, plugin: Plugin | null = null) {
        ticks += this.ticks;
        const timeout = new Timeout(this, plugin, ticks, callback);
        if (!this.timeouts.has(ticks)) {
            this.timeouts.set(ticks, new Set([timeout]));
        } else this.timeouts.get(ticks).add(timeout);
        return timeout;
    };

    repeatFunc(period: number, callback: () => void, plugin: Plugin | null = null) {
        return this.repeatFuncDelayed(0, period, callback, plugin);
    };

    repeatFuncDelayed(delay: number, period: number, callback: () => void, plugin: Plugin | null = null) {
        if (delay <= 0) {
            callback();
            delay = period;
        }
        const interval = new Interval(this, plugin, this.ticks + delay, period, callback);
        this.intervals.add(interval);
        return interval;
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
            this.closeReason = "Created server.json, please edit it and restart the server.";
            printer.warn(this.closeReason);
            return this.close();
        } else {
            try {
                const got = JSON.parse(this.readFile("server.json").toString());
                const r = ZServerConfig.safeParse(got);
                if (!r.success) {
                    printer.error(`Invalid server.json. Errors:\n${
                        r.error.errors.map(e => e.path.join(" and ") + ": " + e.message).join("\n")
                    }\nPlease edit it and restart the server.`);
                    this.closeReason = "Invalid server.json, please edit it and restart the server.";
                    return this.close();
                }
                this.config = got;
            } catch (e) {
                printer.error(e);
                this.closeReason = "Invalid server.json, please edit it and restart the server.";
                printer.warn(this.closeReason);
                printer.info("Default config: ", JSON.stringify(DefaultServerConfig, null, 2));
                this.close();
                return;
            }
        }
    };

    loadStorage() {
        if (this.fileExists("storage.dat")) {
            let buffer = this.readFile("storage.dat");
            buffer = zstdOptionalDecode(buffer);
            this.storage = X.object.deserialize(buffer);
        } else this.storage = {};
    };

    private throwPluginIntegrityError(folder: string, message: string | Error) {
        if (typeof message === "string") message = new Error(message);
        printer.error("Failed to load plugin %c" + folder, "color: yellow");
        printer.error(message);
        printer.error("Closing the server for plugin integrity.");
        this.closeReason = message.message;
        this.close();
    }

    async loadPlugins() {
        const nonReadyPluginNames = new Set<string>;

        const url = await import(/* @vite-ignore */ "url");

        for (const folder of this.readDirectory("plugins")) {
            try {
                const meta = <PluginMetadata>JSON.parse(this.readFile(`plugins/${folder}/plugin.json`).toString());
                ZPluginMetadata.parse(meta);

                if (meta.name in this.pluginMetas) {
                    return this.throwPluginIntegrityError(folder, "Duplicate plugin.");
                }

                this.pluginMetas[meta.name] = meta;
                const mainPath = `plugins/${folder}/${meta.main}`;
                const exp = await import(/* @vite-ignore */ url.pathToFileURL(mainPath).toString());
                if (!("default" in exp) || typeof exp.default !== "function") {
                    return this.throwPluginIntegrityError(folder, "Plugin main file doesn't have a default function export.");
                }

                const plugin = this.plugins[meta.name] = <Plugin>new (exp.default)(this, meta);

                if (!(plugin instanceof Plugin)) {
                    return this.throwPluginIntegrityError(folder, "Plugin main file doesn't export a Plugin class.");
                }

                plugin.onLoad();
                this.registerEvents(plugin);

                nonReadyPluginNames.add(meta.name);
            } catch (e) {
                return this.throwPluginIntegrityError(folder, e);
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
                this.close(`Circular dependencies detected in the plugins: ${Array.from(nonReadyPluginNames).join(", ")}. Closing the server for plugin integrity.`);
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

        clazz._eventHandlers.clear();
    };

    disablePlugin(plugin: Plugin) {
        this.unregisterEvents(plugin);
        for (const interval of plugin._intervals) clearInterval(interval);
        plugin._intervals.length = 0;
        for (const cancellable of plugin._cancellable) cancellable.cancel();
        plugin.onDisable();
    };

    getAllEntities() {
        const entities: Entity[] = [];

        for (const world in this.worlds) {
            entities.push(...Object.values(this.worlds[world].entities));
        }

        return entities;
    };

    executeSelector(as: CommandAs, at: Position, selector: SelectorToken) {
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
                        const allow = entity.saveStruct.keys();
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
            return ZWorldMetaData.parse(conf);
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

        const version = data.generationVersion;
        if (version !== WorldGenerationVersion) {
            if (folder === this.config.defaultWorld) this.close(`World ${folder} was generated by ${version > Version ? "a newer" : "an older"} version of `
                + `the server(${version > Version ? "" : `Version: ${Versions[version]}`}Version ID: ${version}).\n`
                + `You can either delete the world for it to regenerate or you can replace it with another chunk that `
                + `was generated by the same version of the server(Version: ${VersionString}, Version ID: ${Version}).`);

            return null;
        }

        const gen = Generators[data.generator];
        const world = new World(
            this, data.name, folder, data.seed, new gen(data.generatorOptions),
            new Set(this.getWorldChunkList(folder)), data
        );
        this.worlds[folder] = world;
        world.ensureSpawnChunks();
        return world;
    };

    createWorld(folder: string, data: WorldMetaData): boolean {
        if (this.worldExists(folder)) return false;
        this.createDirectory("worlds/" + folder);
        this.createDirectory("worlds/" + folder + "/chunks");
        data.generationVersion = WorldGenerationVersion;
        this.writeFile("worlds/" + folder + "/world.json", JSON.stringify(data, null, 2));
        return true;
    };


    update(dt: number) {
        if (this.pausedUpdates) return;

        for (const folder in this.worlds) {
            this.worlds[folder].serverUpdate(dt);
        }

        for (const playerName in this.players) {
            const player = this.players[playerName];
            player.serverUpdate(dt);
        }

        console.time();
        this.tickAccumulator += dt;
        const df = 1 / this.targetTickRate;
        if (this.tickAccumulator > df || this.tickNow > 0) {
            this.tickNow -= 1;
            this.tickAccumulator %= df;
            this.tick();
        }
        console.timeEnd();
    };

    tick() {
        if (this.tickFrozen && this.stepTicks <= 0) return;
        this.stepTicks = 0;
        this.ticks++;
        const now = Date.now();
        this._ticksLastSecond = this._ticksLastSecond.filter(i => i > now - 1000);
        this._ticksLastSecond.push(now);
        this.tickRate = this._ticksLastSecond.length;

        if (this.tickRate < 15 && this.ticks > 20 && this.tickCooldown < now) {
            printer.warn(`Lag detected: ${this.tickRate} TPS`);
            this.tickCooldown = now + 3000;
        }

        if (++this.saveCounter > this.config.saveIntervalTicks) {
            this.saveAll();
            this.saveCounter = 0;
        }

        for (const folder in this.worlds) {
            this.worlds[folder].serverTick();
        }

        const timeouts = this.timeouts.get(this.ticks);
        if (timeouts) {
            for (const timeout of timeouts) {
                timeout.callback(timeout);
                timeout.plugin?._cancellable?.delete(timeout);
            }
            this.timeouts.delete(this.ticks);
        }

        const intervals = [...this.intervals];
        for (let i = 0; i < intervals.length; i++) {
            const interval = intervals[i];
            if (this.ticks >= interval.next) {
                interval.next += interval.period;
                interval.callback(interval);
            }
        }
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

    executeCommandLabel(sender: CommandSender, as: CommandAs, at: Position, label: string) {
        const split = label.split(" ");
        const commandLabel = split[0].toLowerCase();
        const command = this.commands[commandLabel];

        if (!command || (command.permission && !sender.hasPermission(command.permission))) {
            const allowed: string[] = [];
            for (const cmd in this.commands) {
                const c = this.commands[cmd];
                if (!c.permission || sender.hasPermission(c.permission)) allowed.push(cmd, ...c.aliases);
            }

            allowed.sort((a, b) => a.localeCompare(b));

            const suggested = suggestString(commandLabel, allowed.filter(i => i !== "help" && /^[a-zA-Z\d]+$/.test(i)));
            if (suggested) {
                sender.sendMessage(`§cUnknown command: ${commandLabel}. Did you mean §e${suggested}§c? Type /help for a list of commands`);
                return;
            }

            sender.sendMessage(`§cUnknown command: ${commandLabel}. Type /help for a list of commands`);
            return;
        }

        const args = split.slice(1);
        try {
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
                player instanceof Entity ? (<Entity>player) : new Position(0, 0, 0, this.defaultWorld),
                message.substring(1)
            );
        } else this.processChat(player, message);
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

    saveStorage() {
        this.writeFile("storage.dat", zstdOptionalEncode(X.object.serialize(this.storage)));
    };

    saveAll() {
        this.saveWorlds();
        this.savePlayers();
        this.saveBans();
        this.saveStorage();
    };

    close(err?: string) {
        if (err) printer.error(err);
        if (this.closed) return false;
        if (err) this.closeReason = err;

        this.closed = true;

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
        this.saveStorage();

        if (this.socketServer) this.socketServer.close();
        clearInterval(this.intervalId);
        return true;
    };
}