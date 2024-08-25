import {TagBytes} from "../Tag";
import {TagMatch} from "../TagManager";
import {BaseNumberTag} from "./BaseNumberTag";

const SIZE = 4;

export class UInt32Tag extends BaseNumberTag {
    check(num: any) {
        return !isNaN(num) && typeof num === "number" && num === Math.floor(num) && num >= 0 && num <= 4294967295;
    };

    getSize() {
        return 1 + SIZE;
    };

    write(buffer: Buffer, j: number) {
        buffer[j++] = TagBytes.UINT32;
        buffer.writeUInt32BE(this.value, j);
        return j + SIZE;
    };

    static read(buffer: Buffer, j: number) {
        return [j + SIZE, new UInt32Tag(buffer.readUInt32BE(j))];
    };
}

TagMatch[TagBytes.UINT32] = UInt32Tag;