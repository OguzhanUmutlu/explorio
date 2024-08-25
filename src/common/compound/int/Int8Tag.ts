import {TagBytes} from "../Tag";
import {TagMatch} from "../TagManager";
import {BaseNumberTag} from "./BaseNumberTag";

const SIZE = 1;

export class Int8Tag extends BaseNumberTag {
    check(num: any) {
        return !isNaN(num) && typeof num === "number" && num === Math.floor(num) && num >= -128 && num <= 127;
    };

    getSize() {
        return 1 + SIZE;
    };

    write(buffer: Buffer, j: number) {
        buffer[j++] = TagBytes.INT8;
        buffer.writeInt8(this.value, j);
        return j + SIZE;
    };

    static read(buffer: Buffer, j: number) {
        return [j + SIZE, new Int8Tag(buffer.readInt8(j))];
    };
}

TagMatch[TagBytes.INT8] = Int8Tag;