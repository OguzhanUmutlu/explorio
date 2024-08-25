import {TagBytes} from "../Tag";
import {TagMatch} from "../TagManager";
import {BaseNumberTag} from "./BaseNumberTag";

const SIZE = 2;

export class UInt16Tag extends BaseNumberTag {
    check(num: any) {
        return !isNaN(num) && typeof num === "number" && num === Math.floor(num) && num >= 0 && num <= 65535;
    };

    getSize() {
        return 1 + SIZE;
    };

    write(buffer: Buffer, j: number) {
        buffer[j++] = TagBytes.UINT16;
        buffer.writeUInt16BE(this.value, j);
        return j + SIZE;
    };

    static read(buffer: Buffer, j: number) {
        return [j + SIZE, new UInt16Tag(buffer.readUInt16BE(j))];
    };
}

TagMatch[TagBytes.UINT16] = UInt16Tag;