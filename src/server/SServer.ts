import {Server} from "../common/Server";
import {Generators, getRandomSeed, WorldMetaData} from "../common/world/World";
import {SWorld} from "./world/SWorld";
import * as fs from "fs";
import {SPlayer} from "./entity/SPlayer";
import {Packet} from "../common/packet/Packet";
import {SendMessagePacket} from "../common/packet/common/SendMessagePacket";

export type ServerConfig = {
    port: number,
    "default-world": string,
    "default-worlds": Record<string, WorldMetaData>
};

export const DefaultServerConfig: ServerConfig = {
    port: 1881,
    "default-world": "default",
    "default-worlds": {
        default: {
            name: "default",
            generator: "default",
            generatorOptions: "",
            seed: getRandomSeed()
        }
    }
};

export class SServer extends Server<SWorld, SPlayer> {
    static instance: SServer;

    config: ServerConfig;

    constructor() {
        super();
        SServer.instance = this;
    };

    init() {
        super.init();
        if (!fs.existsSync("./server.json")) {
            fs.writeFileSync("./server.json", JSON.stringify(DefaultServerConfig, null, 2));
            printer.warn("Created server.json, please edit it and restart the server");
            process.exit(0);
        }
        this.config = JSON.parse(fs.readFileSync("./server.json", "utf8"));
        if (!fs.existsSync("./worlds")) fs.mkdirSync("./worlds");
        for (const folder in this.config["default-worlds"]) {
            this.createWorld(folder, this.config["default-worlds"][folder]);
        }
        for (const folder of this.getWorldFolders()) {
            if (this.loadWorld(folder)) printer.pass("Loaded world %c" + folder, "color: yellow");
            else printer.fail("Failed to load world %c" + folder, "color: yellow");
        }
        if (!(this.config["default-world"] in this.worlds)) {
            printer.error("Default world couldn't be found. Please create the world named '" + this.config["default-world"] + "'");
            this.close();
        }
        this.defaultWorld = this.worlds[this.config["default-world"]];
        this.operators = fs.existsSync(`./ops.txt`)
            ? fs.readFileSync("ops.txt", "utf8").split("\n").filter(i => i)
            : [];
    };

    createWorld(folder: string, data: WorldMetaData): boolean {
        if (this.worldExists(folder)) return false;
        fs.mkdirSync("./worlds/" + folder);
        fs.mkdirSync("./worlds/" + folder + "/chunks");
        fs.writeFileSync("./worlds/" + folder + "/data.json", JSON.stringify(data, null, 2));
        return true;
    };

    getWorldChunkList(folder: string): number[] | null {
        if (!fs.existsSync("./worlds/" + folder)) return null;
        const path = "./worlds/" + folder + "/chunks";
        if (!fs.existsSync(path)) fs.mkdirSync(path);
        return fs.readdirSync(path).map(file => parseInt(file.split(".")[0]));
    };

    getWorldData(folder: string): WorldMetaData | null {
        const path = "./worlds/" + folder + "/data.json";
        if (!fs.existsSync(path)) return null;
        return JSON.parse(fs.readFileSync(path, "utf8"));
    };

    getWorldFolders(): string[] {
        return fs.readdirSync("./worlds");
    };

    loadWorld(folder: string): SWorld | null {
        const data = this.getWorldData(folder);
        if (!data) return null;
        const gen = <any>Generators[data.generator];
        const world = new SWorld(
            this, data.name, folder, data.seed, new gen(data.generatorOptions),
            new Set(this.getWorldChunkList(folder)));
        this.worlds[folder] = world;
        world.ensureSpawnChunks();
        return world;
    };

    worldExists(folder: string): boolean {
        return fs.existsSync("./worlds/" + folder);
    };

    update(dt: number) {
        super.update(dt);
        for (const player of this.players) {
            player.network.releaseBatch();
        }
    };

    close(): void {
        printer.info("Closing the server...");
        printer.info("Saving the worlds...");
        for (const folder in this.worlds) {
            this.worlds[folder].save();
            printer.pass("Saved world %c" + folder, "color: yellow");
        }
        process.exit();
    };

    broadcastPacket(pk: Packet<any>, exclude: SPlayer[] = [], immediate = false) {
        for (const player of this.players) {
            if (!exclude.includes(player)) player.network.sendPacket(pk, immediate);
        }
    };

    broadcastMessage(message: string) {
        this.broadcastPacket(new SendMessagePacket(message));
    };

    saveOperators() {
        fs.writeFileSync("./ops.txt", this.operators.join("\n"));
    };
}