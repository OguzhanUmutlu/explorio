import X, {Bin} from "stramp";
import {ItemStruct} from "../item/Item";
import {Inventory} from "../item/Inventory";
import {Entities, EntityClasses} from "../meta/Entities";
import {Entity} from "../entity/Entity";
import {ChunkBlocksBin} from "./Bins";
import {ZstdSimple} from "@oneidentity/zstd-js";
import {Inventories, InventorySizes} from "../meta/Inventories";
import {World} from "../world/World";
import {Server} from "../Server";
import {Location} from "./Location";

let server: Server;

export function getServer() {
    return server;
}

export function setServer(server_: Server) {
    server = server_;
}

export function getUTCDate() {
    return Date.now() + new Date().getTimezoneOffset() * 60 * 1000;
}

export function simpleTypeChecker(sample: any, any: any) {
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

export const WORLD_HEIGHT_EXP = 9;
export const WORLD_HEIGHT = 1 << WORLD_HEIGHT_EXP;
export const CHUNK_LENGTH_BITS = 4;
export const CHUNK_LENGTH = 1 << CHUNK_LENGTH_BITS;
export const CHUNK_LENGTH_N = CHUNK_LENGTH - 1;
export const SUB_CHUNK_AMOUNT = WORLD_HEIGHT / CHUNK_LENGTH;

export const SURFACE_HEIGHT = 172;
export const CAVE_SCALE = 40;

export const ChunkStruct = X.object.struct({
    data: ChunkBlocksBin
});

const ItemList = X.array.typed(ItemStruct.or(X.null));

export const ContainerStruct = (size: number) => {
    return X.makeBin({
        name: `Container<${size}>`,
        write: (buffer, index, inv) => ItemList.write(buffer, index, inv.getContents()),
        read: (buffer, index) => new Inventory(size).setContents(ItemList.read(buffer, index)),
        size: inv => ItemList.getSize(inv.getContents()),
        validate: inv => ItemList.validate(inv.getContents()),
        sample: () => new Inventory(size)
    });
};

export const WorldFolder: Bin<World> = X.makeBin({
    name: "World",
    write: (buffer, index, value) => X.string8.write(buffer, index, value.folder),
    read: (buffer, index) => getServer().worlds[X.string8.read(buffer, index)],
    size: world => X.string8.getSize(world.folder),
    validate: world => X.string8.validate(world.folder),
    sample: () => getServer().defaultWorld
});

export const EntityStruct = X.object.struct({
    x: X.f32,
    y: X.f32,
    tags: X.set.typed(X.string16),
    walkSpeed: X.f32,
    flySpeed: X.f32,
    jumpVelocity: X.f32,
    health: X.f32,
    maxHealth: X.f32,
    gravity: X.f32,
    canPhase: X.bool,
    immobile: X.bool
});

export const PlayerStruct = EntityStruct.extend({
    world: WorldFolder,
    permissions: X.set.typed(X.string16),
    handIndex: X.u8,
    [Inventories.Hotbar]: ContainerStruct(InventorySizes.hotbar),
    [Inventories.Player]: ContainerStruct(InventorySizes.player),
    [Inventories.Armor]: ContainerStruct(InventorySizes.armor),
    [Inventories.Cursor]: ContainerStruct(InventorySizes.cursor),
    [Inventories.Chest]: ContainerStruct(InventorySizes.chest),
    [Inventories.DoubleChest]: ContainerStruct(InventorySizes.doubleChest),
    [Inventories.CraftingSmall]: ContainerStruct(InventorySizes.craftingSmall),
    [Inventories.CraftingSmallResult]: ContainerStruct(InventorySizes.craftingSmallResult),
    [Inventories.CraftingBig]: ContainerStruct(InventorySizes.craftingBig),
    [Inventories.CraftingBigResult]: ContainerStruct(InventorySizes.craftingBigResult),
    xp: X.u32,
    blockReach: X.f32,
    attackReach: X.f32,
    isFlying: X.bool,
    canToggleFly: X.bool,
    food: X.f32,
    maxFood: X.f32
});

export const EntityStructs = {
    [Entities.PLAYER]: PlayerStruct
};

export const EntitySaveStruct: Bin<Entity> = X.makeBin({
    name: "Entity",
    write: (buffer, index, entity) => {
        buffer[index[0]++] = entity.typeId;
        entity.struct.write(buffer, index, entity);
    },
    read: (buffer, index) => {
        const typeId = buffer[index[0]++];
        const struct = EntityStructs[typeId];
        const obj = struct.read(buffer, index);
        const entity = new (EntityClasses[typeId])(null);

        for (const k in obj) {
            entity[k] = obj[k];
        }

        return entity;
    },
    size: entity => 1 + entity.struct.getSize(entity),
    validate: entity => {
        if (!(entity instanceof Entity) || !entity.struct) return "Not an entity";
    },
    sample: () => <Entity>null
});

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

export function checkAny(source: any, target: any) {
    if (source === target) return true;

    if (typeof source === "object" && source !== null) {
        if ((Array.isArray(source) && !checkArray(source, target)) || !checkObject(source, target)) return false;
        else if (!checkObject(source, target)) return false;
    }

    return true;
}

export function checkArray(source: any[], target: any) {
    if (!Array.isArray(target)) return false;
    if (source.length !== target.length) return false;
    for (let i = 0; i < source.length; i++) {
        if (!checkAny(source[i], target[i])) return false;
    }
    return true;
}

export function checkObject(source: Record<string, any>, target: any) {
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