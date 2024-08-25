import {TagBytes} from "../Tag";
import {TagMatch} from "../TagManager";
import {BaseNumberTag} from "./BaseNumberTag";

const SIZE = 8;

// @ts-ignore
export class UInt64Tag extends BaseNumberTag {
    constructor(public value: bigint) {
        super(<number><unknown>value);
        this.apply(value);
    };

    check(num: any) {
        return typeof num === "bigint" && num >= 0 && num <= (2n ** 64n);
    };

    getSize() {
        return 1 + SIZE;
    };

    write(buffer: Buffer, j: number) {
        buffer[j++] = TagBytes.UINT64;
        buffer.writeBigUInt64BE(this.value, j);
        return j + SIZE;
    };

    static read(buffer: Buffer, j: number) {
        return [j + SIZE, new UInt64Tag(buffer.readBigUInt64BE(j))];
    };
}

TagMatch[TagBytes.UINT64] = UInt64Tag;