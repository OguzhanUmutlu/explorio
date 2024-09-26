import {Server} from "../../common/Server";
import {CWorld} from "./world/CWorld";
import {Generators, WorldMetaData} from "../../common/world/World";
import {CPlayer} from "./entity/types/CPlayer";
import {WorldData} from "./Client";

// This is specifically designed to be used in singleplayer.
export class CServer extends Server<CWorld, CPlayer> {
    constructor(public uuid: string) {
        super();
    };

    init() {
        super.init();
        if (!bfs.existsSync("singleplayer")) bfs.mkdirSync("singleplayer");
        if (!bfs.existsSync(`singleplayer/${this.uuid}`)) bfs.mkdirSync(`singleplayer/${this.uuid}`);
        if (!bfs.existsSync(`singleplayer/${this.uuid}/worlds`)) bfs.mkdirSync(`singleplayer/${this.uuid}/worlds`);
        if (!this.getWorldData("default")) {
            this.createWorld("default", {
                name: "default",
                generator: "default",
                generatorOptions: "",
                seed: WorldData.seed
            });
            this.loadWorld("default");
        }
        for (const folder of this.getWorldFolders()) {
            if (this.loadWorld(folder)) printer.info("Loaded world %c" + folder, "color: yellow");
            else printer.fail("Failed to load world %c" + folder, "color: yellow");
        }
        this.defaultWorld = this.worlds.default;
    };

    getWorldFolders(): string[] {
        return ["default"];
    };

    worldExists(folder: string): boolean {
        return bfs.existsSync(`singleplayer/${this.uuid}/worlds/${folder}`);
    };

    getWorldData(folder: string): WorldMetaData | null {
        const path = `singleplayer/${this.uuid}/worlds/${folder}/data.json`;
        if (!bfs.existsSync(path)) return null;
        return JSON.parse(bfs.readFileSync(path, "utf8"));
    };

    getWorldChunkList(folder: string): number[] | null {
        const path = `singleplayer/${this.uuid}/worlds/${folder}/chunks`;
        if (!bfs.existsSync(path)) return null;
        return bfs.readdirSync(path).map(x => Number(x.split(".")[0]));
    };

    loadWorld(folder: string): CWorld | null {
        const dat = this.getWorldData(folder);
        if (!dat) return null;

        const gen = Generators[dat.generator];
        if (!gen) return null;
        return this.worlds[folder] = new CWorld(this, dat.name, folder, dat.seed, new gen(dat.generatorOptions), new Set(this.getWorldChunkList(folder)));
    };

    createWorld(folder: string, data: WorldMetaData): boolean {
        if (this.worldExists(folder)) return false;
        bfs.mkdirSync(`singleplayer/${this.uuid}/worlds/${folder}`);
        bfs.mkdirSync(`singleplayer/${this.uuid}/worlds/${folder}/chunks`);
        bfs.writeFileSync(`singleplayer/${this.uuid}/worlds/${folder}/data.json`, JSON.stringify(data));
        return true;
    };

    close(): void {
        for (const folder in this.worlds) {
            this.worlds[folder].save();
        }
        // location.href = "./";
        // todo: pseudo-kick the client
    };
}