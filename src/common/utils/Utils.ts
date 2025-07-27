import {ZstdSimple} from "@oneidentity/zstd-js";
import Server from "@/Server";
import Position from "@/utils/Position";
import {im2data, name2data} from "@/item/ItemFactory";
import {ChunkGroupBits, ChunkGroupLengthN, ChunkLengthBits, ChunkLengthN} from "@/meta/WorldConstants";
import Entity from "@/entity/Entity";
import Inventory from "@/item/Inventory";
import Item from "@/item/Item";
import World from "@/world/World";
import {z} from "zod";
import {readWordOrString} from "@/command/CommandProcessor";
import CommandError from "@/command/CommandError";
import {Buffer} from "buffer";
import Printer from "fancy-printer";

declare global {
    let printer: typeof Printer.brackets;
}

let server: Server;

export const UsernameRegex = /^[a-zA-Z][a-zA-Z\d]{4,19}$/;

export type ClassOf<T, K = unknown> = new (...args: K[]) => T;

export const SoundFiles = [];

export function getServer() {
    return server;
}

export function setServer(server_: Server) {
    server = server_;
}

export function clearUndefinedValues(obj: object) {
    for (const key in obj) if (obj[key] === undefined) delete obj[key];
}

export function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function rand(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

export function rotateMeta(id: number, meta: number, rotation: number) {
    const baseBlock = im2data(id);
    if (baseBlock && (baseBlock.isSlab || baseBlock.isStairs)) return meta % (baseBlock.metas.length / 4) + rotation * baseBlock.metas.length / 4;
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
if (typeof process !== "undefined" && process.versions?.node) {
    assetsBase = `${import.meta.dirname}/../client/`;
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

export const SelectorSorters: Record<string, (a: Entity, b: Entity, at: Position) => number> = {
    nearest: (a, b, at) => a.distance(at.x, at.y) - b.distance(at.x, at.y),
    furthest: (a, b, at) => b.distance(at.x, at.y) - a.distance(at.x, at.y),
    type: (a, b) => a.typeName.localeCompare(b.typeName),
    random: () => Math.random() - 0.5,
    name: (a, b) => a.name.localeCompare(b.name),
    id: (a, b) => a.id - b.id
};

export function allocBuffer(size: number, safe = true) {
    const buffer = safe ? Buffer.alloc(size) : Buffer.allocUnsafe(size);
    // @ts-expect-error Come on eslint.
    buffer._isBuffer = true;
    return buffer;
}

export function copyBuffer(buffer: Buffer | Uint8Array | number[]) {
    const newBuffer = Buffer.from(buffer);
    // @ts-expect-error Come on eslint.
    newBuffer._isBuffer = true;
    return newBuffer;
}

export function zstdOptionalEncode(buffer: Buffer) {
    if (buffer.length > 100) {
        const compressed = ZstdSimple.compress(buffer);
        const buffer2 = allocBuffer(compressed.length + 1);
        buffer2[0] = 1;
        buffer2.set(compressed, 1);
        return buffer2;
    }

    const buffer2 = allocBuffer(buffer.length + 1);
    buffer2[0] = 0; // just to be safe
    buffer.copy(buffer2, 1);
    return buffer2;
}

export function zstdOptionalDecode(buffer: Buffer) {
    const sliced = allocBuffer(buffer.length - 1);
    buffer.copy(sliced, 0, 1);

    if (buffer[0] === 1) return copyBuffer(ZstdSimple.decompress(sliced));

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

// c = chunk
// g = group
// r = relative (0-15)
// Put x and y next to them to make sense of them.
// x means world x by default
// rx means relative x in chunk
// so rxy means relative x in chunk and world y
// and rxry would mean relative x and relative y in chunk

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
export function rxy2ci(relX: number, y: number) {
    return relX + (y << ChunkLengthBits);
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

/** @description Chunk X to chunk group X */
export function cx2cgx(chunkX: number) {
    return chunkX >> ChunkGroupBits;
}

/** @description Chunk X to chunk group index */
export function cx2cgi(chunkX: number) {
    return chunkX & ChunkGroupLengthN;
}

/** @description Chunk group X to chunk X */
export function cgx2cx(chunkGroupX: number) {
    return chunkGroupX << ChunkGroupBits;
}


type SimpleJSON = number | string | null | boolean | undefined | { [k: string]: SimpleJSON } | SimpleJSON[];

export function simpleJSONify(value: unknown): SimpleJSON {
    switch (typeof value) {
        case "object": {
            if (Symbol.iterator in value) return Array.from(<Iterable<unknown>>value).map(simpleJSONify);

            const obj = {};

            for (const key in value) {
                obj[key] = simpleJSONify(value[key]);
            }

            return obj;
        }
        case "function": {
            return value.name;
        }
        case "bigint":
        case "symbol":
            return value.toString();
        case "boolean":
        case "number":
        case "string":
        case "undefined":
            return value;
    }
}

export function formatDataForChat(data: unknown) {
    switch (typeof data) {
        case "undefined":
            return "§7null";
        case "string":
            return "§a" + JSON.stringify(data);
        case "number":
            return "§e" + data;
        case "boolean":
            return "§6" + data;
        case "bigint":
            return "§9" + data + "n";
        case "function":
            return "§c<function>";
        case "object":
            if (data === null) return "§7null";
            if (data.constructor === Object) {
                const length = Object.keys(data).length;
                if (length === 0) return "§d{}";
                return `§d{ ` + Object.keys(data).map(k => ` §f${k}§7: ${formatDataForChat(data[k])}`).join(`§7, `) + ` §d}`;
            }

            if (Array.isArray(data)) {
                const length = data.length;
                if (length === 0) return "§d[]";
                return `§d[ ` + data.map(i => formatDataForChat(i)).join("§7, §r") + ` §d]`;
            }

            if (data instanceof Set) return formatDataForChat(Array.from(data));
            if (data instanceof Inventory) return formatDataForChat({name: data.name, contents: data.getContents()});

            if (data instanceof Item) {
                const newObj: {
                    identifier: string,
                    count: number,
                    components?: typeof data.components
                } = {identifier: data.toMetadata().identifier, count: data.count};
                const components = {...data.components};
                clearUndefinedValues(components);
                if (Object.keys(components).length) newObj.components = components;
                return formatDataForChat(newObj);
            }

            return "§c<" + data.constructor.name + ">";
        case "symbol":
            return "§b" + data.toString();
    }
}

export function getIndex(part: unknown, length: number) {
    let index = +part;
    if (isNaN(index) || !Number.isSafeInteger(index) || index < -length || index >= length) return null;
    if (index < 0) index = length + index;
    return index;
}

const itemType = z.object({
    id: z.number(),
    meta: z.number(),
    count: z.number(),
    components: z.object({
        damage: z.number().optional()
    })
});

const itemArrayType = z.array(itemType.or(z.null()));

export function setSafely(obj: object, key: number, value: unknown) {
    if (Array.isArray(obj)) {
        if (key < 0 || key >= obj.length || !Number.isSafeInteger(key)) throw new CommandError("Invalid array index");

        if ("__belongsTo" in obj) {
            if (value === null) {
                obj[key] = null;
                return true;
            }
            if (typeof value !== "object" || !itemType.safeParse(value).success) throw new CommandError("Invalid item");
            obj[key] = value;
            return true;
        }

        if (!checkAny(obj[key], value)) throw new CommandError("Array item mismatch");
        obj[key] = value;
        return true;
    }

    throw new CommandError("Cannot set object item safely");
}

export function splitPathSafely(path: string): string[] {
    const parts: string[] = [];

    let index = 0;
    while (index < path.length) {
        const char = path[index];
        if (char === ".") {
            index++;
            continue;
        }

        const th = readWordOrString(path, index, /^[a-zA-Z~_^!\d]+/);
        index = th.end;
        parts.push(th.value);
    }

    return parts;
}

export function accessPathSafely(data: unknown, parts: string[]) {
    if (parts.length === 0) return data;
    let obj = data;
    let bef_string = false;

    for (let i = 0; i < parts.length; i++) {
        let part: string | number = parts[i];

        if (obj === null) throw new CommandError("Cannot index null");

        if (typeof obj === "string") {
            if (bef_string) throw new CommandError("Cannot index char");
            obj = [...obj];
            bef_string = true;
        } else bef_string = false;

        if (typeof obj !== "object") throw new CommandError("Cannot index " + typeof obj);

        if (obj instanceof Set) obj = [...obj];
        if (Array.isArray(obj)) {
            part = getIndex(part, obj.length);
            if (part === null) throw new CommandError("Invalid array index");
        } else if (obj instanceof Item) {
            if (part === "identifier") {
                obj = obj.toMetadata().identifier;
                continue;
            }
            if (!["count", "components"].includes(<string>part)) throw new CommandError("Invalid item field");
        } else if (obj instanceof Inventory) {
            if (part === "contents") {
                obj = obj.getContents();
                continue;
            }

            if (part !== "name") throw new CommandError("Invalid inventory field");
        } else if (obj.constructor !== Object) throw new CommandError("Cannot access " + typeof obj); // illegal access

        obj = obj[part];
    }

    return obj;
}

function operateUnsafe(data: unknown, key: string, operator: string, value: unknown) {
    if (operator === "=") return data[key] = value;

    if (typeof data[key] !== "number" || typeof value !== "number") throw new CommandError("Cannot operate on " + typeof data[key]);

    if (operator === "+") data[key] += value;
    else if (operator === "-") data[key] -= value;
    else if (operator === "*") data[key] *= value;
    else if (operator === "**") data[key] **= value;
    else if (operator === "/") data[key] /= value;
    else if (operator === "%") data[key] %= value;
    else if (operator === ">>") data[key] >>= value;
    else if (operator === "<<") data[key] <<= value;
    else if (operator === "&") data[key] &= value;
    else if (operator === "|") data[key] |= value;
    else if (operator === "^") data[key] ^= value;
    else if (operator === "&&") data[key] &&= value;
    else if (operator === "||") data[key] ||= value;
}

export function operatePathSafely(data: unknown, path: string, operator: string, value: unknown) {
    const parts = splitPathSafely(path);
    const bef = parts.length < 1 ? undefined : accessPathSafely(data, parts.slice(0, -2));
    const obj = parts.length < 2 ? data : accessPathSafely(bef, [parts.at(-2)]);
    const key = parts.at(-1)!;

    if (typeof obj === "string") {
        if (typeof bef === "string") throw new CommandError("Cannot index char");
        if (operator === "append") {
            obj[key] += value;
        } else {
            const index = getIndex(key, obj.length);
            if (index === null) throw new CommandError("Invalid string index");
            if (operator !== "=") throw new CommandError("Invalid operator");
            bef[parts.at(-1)!] = obj.slice(0, index) + value + obj.slice(index + 1);
        }
    } else if (typeof obj === "object") {
        if (obj === null) throw new CommandError("Cannot index null");

        if (obj.constructor.name === "World") {
            const world = (<World>obj).server.worlds[<string>value];
            if (!world) throw new CommandError("Invalid world");
            bef[parts.at(-1)!] = world;
        } else if (Array.isArray(obj)) {
            if (operator === "append") {
                if ("__belongsTo" in obj && obj.__belongsTo instanceof Item) {
                    if (value !== null && !itemType.safeParse(value).success) throw new CommandError("Invalid item");
                    obj.push(value);
                } else {
                    // TODO: THIS MIGHT CAUSE A BUG. IF AN ENTITY OR BLOCK'S NBT HAS AN EMPTY ARRAY, IT CAN BE FILLED WITH ARBITRARY VALUES.
                    if (obj.length > 0 && !checkAny(obj[0], value)) throw new CommandError("Invalid array value");
                    obj.push(value);
                }
            } else {
                const index = getIndex(key, obj.length);
                if (index === null) throw new CommandError("Invalid array index");
                if (operator === "=") setSafely(obj, index, value);
                else operateUnsafe(obj, key, operator, value);
            }
        } else if (obj instanceof Set) {
            if (operator === "append") {
                if (obj.size > 0 && !checkAny(Array.from(obj)[0], value)) throw new CommandError("Invalid set value");
                obj.add(value);
            } else {
                const index = getIndex(key, obj.size);
                if (index === null) throw new CommandError("Invalid set index");
                const list = [...obj];
                if (operator === "=") setSafely(list, index, value);
                else operateUnsafe(list, key, operator, value);
                obj.clear();
                list.forEach(i => obj.add(i));
            }
        } else if (obj instanceof Inventory) {
            if (key !== "contents") throw new CommandError("Invalid inventory field");
            if (!itemArrayType.safeParse(value).success) throw new CommandError("Invalid item array");
            obj.setContents(<(Item | null)[]>value);
        } else if (obj instanceof Item) {
            if (key === "identifier") {
                const item = name2data(<string>value);
                if (!item) throw new CommandError("Invalid item identifier");
                bef[parts.at(-1)!] = new Item(item.id, item.meta, obj.count, {...obj.components});
                return;
            }
            if (!["count", "components"].includes(<string>key)) throw new CommandError("Invalid item field");
            const item = new Item(obj.id, obj.meta, obj.count, {...obj.components});
            operateUnsafe(item, key, operator, value);
            bef[parts.at(-1)!] = item;
        } else {
            operateUnsafe(obj, key, operator, value);
        }
    } else throw new CommandError("Cannot index " + typeof obj);
}

function levenshtein(a: string, b: string) {
    const dp = Array(a.length + 1).fill(null).map(() =>
        Array(b.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,     // deletion
                dp[i][j - 1] + 1,     // insertion
                dp[i - 1][j - 1] + cost  // substitution
            );
        }
    }

    return dp[a.length][b.length];
}

export function suggestString(input: string, strings: string[], maxDistance = 2): string | null {
    let best: { str: string, score: number } | null = null;

    for (const str of strings) {
        const isPrefix = str.startsWith(input);
        if (input.length < 3 && !isPrefix) continue;
        const distance = levenshtein(input, str);
        const score = distance - (isPrefix ? 1 : 0.5); // same bias

        if (score <= maxDistance && (!best || score < best.score)) best = {str, score};
    }

    return best && best.score <= maxDistance ? best.str : null;
}

export function anyToNumber(data: unknown) {
    switch (typeof data) {
        case "number":
            return data;
        case "string":
            return data.length;
        case "bigint":
            return Number(data);
        case "boolean":
            return data ? 1 : 0;
        case "object":
            if (data === null) return 0;
            if (Array.isArray(data) || data instanceof Uint8Array || data instanceof Uint16Array || data instanceof Uint32Array ||
                data instanceof Int8Array || data instanceof Int16Array || data instanceof Int32Array ||
                data instanceof Float32Array || data instanceof Float64Array) return data.length;
            if (data instanceof Map || data instanceof Set) return data.size;
            if (data instanceof Date) return data.getTime();
            return Object.keys(data).length;
        case "function":
        case "symbol":
        case "undefined":
            return 0;
    }
}