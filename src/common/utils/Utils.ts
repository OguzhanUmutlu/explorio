import {EntityIds} from "@/meta/Entities";
import Entity from "@/entity/Entity";
import {ZstdSimple} from "@oneidentity/zstd-js";
import Server from "@/Server";
import Location from "@/utils/Location";
import PlayerStruct from "@/structs/entity/PlayerStruct";
import ItemEntityStruct from "@/structs/entity/ItemEntityStruct";
import {IM} from "@/meta/ItemIds";
import {ChunkLengthBits, ChunkLengthN} from "@/meta/WorldConstants";
import {TileIds} from "@/meta/Tiles";
import ChestTileStruct from "@/structs/tile/ChestTileStruct";
import DoubleChestTileStruct from "@/structs/tile/DoubleChestTileStruct";
import FurnaceTileStruct from "@/structs/tile/FurnaceTileStruct";

let server: Server;

export const UsernameRegex = /^[a-zA-Z\d]{5,20}$/;

export type ClassOf<T, K = unknown> = new (...args: K[]) => T;

export const SoundFiles = [];

export function getServer() {
    return server;
}

export function setServer(server_: Server) {
    server = server_;
}

export function rotateMeta(id: number, meta: number, rotation: number) {
    const baseBlock = IM[id];
    if (baseBlock && (baseBlock.isSlab || baseBlock.isStairs)) meta += rotation * baseBlock.metas.length / 4;
    return meta;
}

export function getUTCDate() {
    return Date.now() + new Date().getTimezoneOffset() * 60 * 1000;
}

export function simpleTypeChecker(sample: unknown, any: unknown) {
    if ((sample === null) !== (any === null)) return false;
    if (sample === null) return true;
    if (typeof sample !== typeof any) return false;
    if (typeof any === "object" && typeof sample === "object") {
        if (!("prototype" in any) || !("prototype" in sample) || sample.prototype !== any.prototype) return false;
        for (const key in sample) {
            if (!simpleTypeChecker(sample[key], any[key])) return false;
        }
    }
    return true;
}

let assetsBase = "./";
if (typeof global !== "undefined") {
    assetsBase = (await import(/* @vite-ignore */ eval("'path'")))
        .dirname((await import(/* @vite-ignore */ eval("'url'")))
            .fileURLToPath(import.meta.url)) + "/../client/";
}

export function simplifyTexturePath(path: string) {
    if (path.startsWith("assets/")) path = assetsBase + path;
    const p = [];
    for (const part of path.split("/")) {
        if (part === "." || part === "") continue;
        if (part === ".." && p.length) p.pop();
        else p.push(part);
    }
    return path;
}

export function serializeUint16Array(chunk: Uint16Array, buffer: Buffer, offset: number) {
    for (let i = 0; i < chunk.length; i++) {
        buffer.writeUInt16LE(chunk[i], offset + i * 2);
    }
}

export function deserializeUint16Array(size: number, buffer: Buffer, offset: number) {
    const chunk = new Uint16Array(size);
    for (let i = 0; i < size; i++) {
        chunk[i] = buffer.readUInt16LE(offset + i * 2);
    }
    return chunk;
}

export const EntityStructs = {
    [EntityIds.PLAYER]: PlayerStruct,
    [EntityIds.ITEM]: ItemEntityStruct
};

export const TileStructs = {
    [TileIds.CHEST]: ChestTileStruct,
    [TileIds.FURNACE]: FurnaceTileStruct,
    [TileIds.DOUBLE_CHEST]: DoubleChestTileStruct
};

export function permissionCheck(permissions: Set<string>, wanted: string) {
    const wantedSpl = wanted.split(".");
    for (const existing of permissions) {
        const existingSpl = existing.split(".");
        let fail = false;
        for (let i = 0; i < existingSpl.length; i++) {
            const ex = existingSpl[i];
            if (ex === "*") return true;
            if (ex !== wantedSpl[i]) {
                fail = true;
                break;
            }
        }
        if (!fail) return true;
    }
    return false;
}

export function checkAny(source: unknown, target: unknown) {
    if (source === target) return true;

    if (typeof source === "object" && source !== null) {
        if ((Array.isArray(source) && !checkArray(source, target)) || !checkObject(source, target)) return false;
    }

    return true;
}

export function checkArray(source: unknown[], target: unknown) {
    if (!Array.isArray(target)) return false;
    if (source.length !== target.length) return false;
    for (let i = 0; i < source.length; i++) {
        if (!checkAny(source[i], target[i])) return false;
    }
    return true;
}

export function checkObject(source: object, target: unknown) {
    if (typeof target !== "object" || target === null || target.constructor !== Object) return false;
    for (const k in source) {
        const v = source[k];
        if (!checkAny(v, target[k])) return false;
    }
    return true;
}

export function xpToLocalXP(xp: number): number {
    const level = xpToLevels(xp);
    const xpForCurrentLevel = levelsToXP(level);
    return xp - xpForCurrentLevel;
}

export function xpToLevels(xp: number): number {
    if (xp < 352) return Math.sqrt(xp + 9) - 3;
    else if (xp < 1507) return 8.1 + Math.sqrt(0.4 * (xp - 195.975));
    else return 325 / 18 + Math.sqrt(2 / 9 * (xp - 54215 / 72));
}

export function levelsToXP(levels: number): number {
    if (levels < 16) return levels * levels + 6 * levels;
    else if (levels < 31) return 2.5 * levels * levels - 40.5 * levels + 360;
    else return 4.5 * levels * levels - 162.5 * levels + 2220;
}

export const SelectorSorters: Record<string, (a: Entity, b: Entity, at: Location) => number> = {
    nearest: (a, b, at) => a.distance(at.x, at.y) - b.distance(at.x, at.y),
    furthest: (a, b, at) => b.distance(at.x, at.y) - a.distance(at.x, at.y),
    type: (a, b) => a.typeName.localeCompare(b.typeName),
    random: () => Math.random() - 0.5,
    name: (a, b) => a.name.localeCompare(b.name),
    id: (a, b) => a.id - b.id
};

export function zstdOptionalEncode(buffer: Buffer) {
    if (buffer.length > 100) {
        const compressed = ZstdSimple.compress(buffer);
        const buffer2 = Buffer.alloc(compressed.length + 1);
        buffer2[0] = 1;
        buffer2.set(compressed, 1);
        return buffer2;
    }

    const buffer2 = Buffer.alloc(buffer.length + 1);
    buffer2[0] = 0; // just to be safe
    buffer.copy(buffer2, 1);
    return buffer2;
}

export function zstdOptionalDecode(buffer: Buffer) {
    const sliced = Buffer.alloc(buffer.length - 1);
    buffer.copy(sliced, 0, 1);

    if (buffer[0] === 1) return Buffer.from(ZstdSimple.decompress(sliced));

    return sliced;
}

const lags = <Record<string, number>>{};

export function checkLag(label: string, ms = 30) {
    if (label in lags) {
        const diff = Date.now() - lags[label];
        if (diff > ms) printer.warn(`Lag detected: label=${label}, ms=${diff}, expected=${ms}`);
        delete lags[label];
    } else {
        lags[label] = Date.now();
    }
}

export function readdirRecursive(fs: typeof import("fs"), path: string) {
    const files = fs.readdirSync(path);
    const res = [];
    for (const file of files) {
        const curPath = `${path}/${file}`;
        if (fs.statSync(curPath).isDirectory()) res.push(...readdirRecursive(fs, curPath));
        else res.push(curPath);
    }
    return res;
}

export function splitByUnderscore(str: string) {
    return str.split("_").map(i => i[0] + i.slice(1).toLowerCase());
}

export function splitByUppercase(str: string) {
    return str.split(/(?=[A-Z])/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

/** @description World X to chunkX */
export function x2cx(x: number) {
    return x >> ChunkLengthBits;
}

/** @description World X to relX */
export function x2rx(x: number) {
    return x & ChunkLengthN;
}

/** @description Converts Chunk X and Chunk Relative X values to World X */
export function cx2x(chunkX: number, relX = 0) {
    return (chunkX << ChunkLengthBits) + relX;
}

/** @description World Y to chunkY */
export function y2cy(y: number) {
    return y >> ChunkLengthBits;
}

/** @description World Y to relY */
export function y2ry(y: number) {
    return y & ChunkLengthN;
}

/** @description ChunkY and relY to world Y */
export function cy2y(chunkY: number, relY = 0) {
    return (chunkY << ChunkLengthBits) + relY;
}

/** @description Rel x and world y to chunk index */
export function rxy2ci(x: number, y: number) {
    return x + (y << ChunkLengthBits);
}

/** @description Rel X and rel Y to chunk index */
export function rxry2ci(relX: number, relY: number) {
    return relX + (relY << ChunkLengthBits);
}

/** @description World X and world Y to chunk index */
export function xy2ci(x: number, y: number) {
    return (x & ChunkLengthN) + (y << ChunkLengthBits);
}

/** @description Chunk index to chunk relative X */
export function i2rx(i: number) {
    return i & ChunkLengthN;
}

/** @description Chunk index to chunk relative Y */
export function i2ry(i: number) {
    return i >> ChunkLengthBits;
}