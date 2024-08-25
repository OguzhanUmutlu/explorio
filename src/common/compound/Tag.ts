import {TagMatch} from "./TagManager";
import {ObjectTag} from "./Object";
import {ListTag} from "./ListTag";
import {StringTag} from "./StringTag";
import {BoolTag} from "./BoolTag";
import {BaseNumberTag} from "./int/BaseNumberTag";
import {InventoryTag} from "./custom/InventoryTag";
import {ItemTag} from "./custom/ItemTag";

// @ts-ignore
export type BufferType = import("node:buffer").Buffer | import("buffer").Buffer;
export type AnyTag = Tag | ObjectTag | ListTag | StringTag | BoolTag | BaseNumberTag | InventoryTag | ItemTag;

// @ts-ignore
export const Buffer = typeof global === "undefined" ? (await import("buffer")).Buffer : global.Buffer;

export const TagBytes = {
    BREAK: 255,
    NULL: 0,
    OBJECT: 1,
    LIST: 2,
    TRUE: 3,
    FALSE: 4,
    BOOL: 3,
    INT8: 5,
    CHAR: 5,
    INT16: 6,
    INT32: 7,
    INT64: 8,
    FLOAT32: 9,
    FLOAT64: 10,
    UINT8: 11,
    UINT16: 12,
    UINT32: 13,
    UINT64: 14,
    STRING: 15,
    STRING_LONG: 16,
    ITEM: 17,
    INVENTORY: 18,
    LEGACY_STRING: 19
};

export abstract class Tag {
    abstract value: any;

    getSize() {
        return 0;
    };

    serialize() {
        return this.value;
    };

    write(buffer: BufferType, j: number) {
        return j;
    };

    toBuffer() {
        const buffer = Buffer.alloc(this.getSize());
        this.write(buffer, 0);
        return buffer;
    };

    apply(any: any) {
        this.value = any;
        return this;
    };

    applyThis(any: any) {
        this.apply(any);
        return this;
    };

    abstract clone(): any;

    static read(buffer: BufferType, j: number): any {
        throw new Error("Cannot read abstract tag");
    };

    static readAny(buffer: BufferType, j: number): [number, AnyTag] {
        return TagMatch[buffer[j++]].read(buffer, j);
    };
}