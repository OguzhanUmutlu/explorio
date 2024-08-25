import {World, WorldMetaData} from "./world/World";

export abstract class Server<WorldType extends World = World> {
    worlds: Record<string, WorldType> = {};
    defaultWorld: WorldType;

    abstract worldExists(folder: string): boolean;

    abstract getWorldData(folder: string): WorldMetaData | null;

    abstract getWorldChunkList(folder: string): number[] | null;

    abstract getWorldFolders(): string[];

    abstract loadWorld(folder: string): WorldType | null;

    abstract createWorld(folder: string, data: WorldMetaData): boolean;

    abstract close(): void;

    update() {
    };
}