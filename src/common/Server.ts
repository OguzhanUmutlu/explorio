import {World, WorldMetaData} from "./world/World";
import {PlayerEntity} from "./entity/types/PlayerEntity";

export type PlayerData = {
    x: number,
    y: number,
    spawnX: number,
    spawnY: number,
    world: string
};

export abstract class Server<WorldType extends World = World, PlayerType extends PlayerEntity = PlayerEntity> {
    __player_type__: PlayerType;

    worlds: Record<string, WorldType> = {};
    defaultWorld: WorldType;
    players: Set<PlayerType> = new Set;
    lastUpdate = Date.now() - 1;
    saveCounter = 0;

    init() {
        setInterval(() => {
            const now = Date.now();
            const dt = Math.min((now - this.lastUpdate) / 1000, 0.015);
            this.lastUpdate = now;
            this.update(dt);
        });
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
}