import X from "stramp";
import {SEntityUpdatePacket} from "../packet/server/SEntityUpdatePacket";

export const zstd = {encode: _ => Buffer.alloc(1), decode: _ => Buffer.alloc(1)};

export function makeZstd(encoder, decoder) {
    zstd.encode = encoder;
    zstd.decode = decoder;
}

export const isServer = typeof global !== "undefined";

export function getUTCDate() {
    return Date.now() + new Date().getTimezoneOffset() * 60 * 1000;
}

export function simpleTypeChecker(sample, any) {
    if ((sample === null) !== (any === null)) return false;
    if (sample === null) return true;
    const t = typeof sample;
    if (t !== typeof any) return false;
    if (sample.prototype !== any.prototype) return false;
    if (t === "object") {
        for (const key in sample) {
            if (!simpleTypeChecker(sample[key], any[key])) return false;
        }
    }
    return true;
}

let assetsBase = "";
if (typeof global !== "undefined") {
    assetsBase = (await import("path")).dirname((await import("url")).fileURLToPath(import.meta.url)) + "/../client/";
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

function findSmallPatterns(array, max = 255) {
    const result = [];
    for (let i = 0; i < array.length; i++) {
        let count = 1;
        while (count < max && array[i] === array[i + 1]) {
            count++;
            i++;
        }
        result.push([array[i], count]);
    }
    return result;
}

function blocksToBuffer(blocks) {
    let zeroEnd = 0;
    for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i] !== 0) {
            zeroEnd = i;
            break;
        }
    }
    const buf = [];
    const spl = findSmallPatterns(blocks.slice(0, zeroEnd + 1));
    for (let i = 0; i < spl.length; i++) {
        const sp = spl[i];
        if (sp[1] > 1) {
            buf.push(0xfe);
            buf.push(sp[1]);
        }
        buf.push(sp[0] & 0xff);
        buf.push((sp[0] >> 8) & 0xff);
    }
    return buf;
}

export const ChunkBlocksBin = X.makeBin({
    name: "chunk",
    write(buffer, index, value) {
        const buf = Buffer.from(blocksToBuffer(value));
        buf.copy(buffer, index[0]);
        index[0] += buf.length;
        buffer[index[0]++] = 0xff;
    },
    read(buffer, index) {
        const blocks = new Uint16Array(CHUNK_LENGTH * WORLD_HEIGHT);
        let i = 0;
        for (; i < blocks.length; i++) {
            if (buffer[index[0]] === 0xff) {
                index[0]++;
                break;
            }
            if (buffer[index[0]] === 0xfe) {
                index[0]++;
                const count = buffer[index[0]++];
                const val = buffer.readUInt16LE(index[0]);
                index[0] += 2;
                for (let j = 0; j < count; j++) {
                    blocks[i++] = val;
                }
                i--;
                continue;
            }
            const val = buffer.readUInt16LE(index[0]);
            index[0] += 2;
            blocks[i] = val;
        }
        return blocks;
    },
    size: value => blocksToBuffer(value).length + 1,
    validate: X.u16array.validate,
    sample: () => new Uint16Array(CHUNK_LENGTH * WORLD_HEIGHT)
});

export const WORLD_HEIGHT_EXP = 9;
export const WORLD_HEIGHT = 1 << WORLD_HEIGHT_EXP;
export const CHUNK_LENGTH_BITS = 4;
export const CHUNK_LENGTH = 1 << CHUNK_LENGTH_BITS;
export const CHUNK_LENGTH_N = CHUNK_LENGTH - 1;
export const SUB_CHUNK_AMOUNT = WORLD_HEIGHT / CHUNK_LENGTH;

export const SURFACE_HEIGHT = 172;
export const CAVE_SCALE = 40;

export const ServerChunkStruct = X.object.struct({
    data: ChunkBlocksBin
});

export const ClientChunkStruct = X.object.struct({
    x: X.i32,
    data: ChunkBlocksBin,
    entities: X.array.typed(SEntityUpdatePacket.struct),
    resetEntities: X.bool
});