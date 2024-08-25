import {TagBytes} from "../Tag";
import {TagMatch} from "../TagManager";
import {BaseNumberTag} from "./BaseNumberTag";

const SIZE = 4;

export class Int32Tag extends BaseNumberTag {
    check(num: any) {
        return !isNaN(num) && typeof num === "number" && num === Math.floor(num) && num >= -2147483648 && num <= 2147483647;
    };

    getSize() {
        return 1 + SIZE;
    };

    write(buffer: Buffer, j: number) {
        buffer[j++] = TagBytes.INT32;
        buffer.writeInt32BE(this.value, j);
        return j + SIZE;
    };

    static read(buffer: Buffer, j: number) {
        return [j + SIZE, new Int32Tag(buffer.readInt32BE(j))];
    };
}

TagMatch[TagBytes.INT32] = Int32Tag;