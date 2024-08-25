import {TagBytes} from "../Tag";
import {TagMatch} from "../TagManager";
import {BaseNumberTag} from "./BaseNumberTag";

const SIZE = 8;

// @ts-ignore
export class Int64Tag extends BaseNumberTag {
    constructor(public value: bigint) {
        super(<number><unknown>value);
        this.apply(value);
    };

    check(num: any) {
        return typeof num === "bigint" && num >= -(2n ** 63n) && num < (2n ** 63n);
    };

    getSize() {
        return 1 + SIZE;
    };

    write(buffer: Buffer, j: number) {
        buffer[j++] = TagBytes.INT64;
        buffer.writeBigInt64BE(BigInt(this.value), j);
        return j + SIZE;
    };

    static read(buffer: Buffer, j: number) {
        return [j + SIZE, new Int64Tag(buffer.readBigInt64BE(j))];
    };
}

TagMatch[TagBytes.INT64] = Int64Tag;