import {Server} from "../../common/Server";
import {CWorld} from "./world/CWorld";
import {Generators, getRandomSeed, WorldMetaData} from "../../common/world/World";

// This is specifically designed to be used in singleplayer.
export class CServer extends Server<CWorld> {
    constructor(public uuid: string) {
        super();
        for (const folder of this.getWorldFolders()) {
            if (this.loadWorld(folder)) console.log("Loaded world %c" + folder, "color: yellow");
            else console.log("Failed to load world %c" + folder, "color: yellow");
        }
        if (!this.worlds.default) {
            this.createWorld("default", {
                name: "default",
                generator: "default",
                generatorOptions: "",
                seed: getRandomSeed()
            });
            this.loadWorld("default");
        }
        this.defaultWorld = this.worlds.default;
    };

    getWorldFolders(): string[] {
        return ["default"];
    };

    worldExists(folder: string): boolean {
        return localStorage.getItem(`explorio.${this.uuid}.${folder}`) !== null;
    };

    getWorldData(folder: string): WorldMetaData | null {
        const dat = localStorage.getItem(`explorio.${this.uuid}.${folder}`);
        if (!dat) return null;
        return JSON.parse(dat);
    };

    getWorldChunkList(folder: string): number[] | null {
        const dat = localStorage.getItem(`explorio.${this.uuid}.${folder}.chunks`);
        if (!dat) return null;
        return JSON.parse(dat);
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
        localStorage.setItem(`explorio.${this.uuid}.${folder}`, JSON.stringify(data));
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