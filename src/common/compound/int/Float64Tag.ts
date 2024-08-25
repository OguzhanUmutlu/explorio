import {TagBytes} from "../Tag";
import {TagMatch} from "../TagManager";
import {BaseNumberTag} from "./BaseNumberTag";

const SIZE = 8;

export class Float64Tag extends BaseNumberTag {
    getSize() {
        return 1 + SIZE;
    };

    write(buffer: Buffer, j: number) {
        buffer[j++] = TagBytes.FLOAT64;
        buffer.writeDoubleBE(this.value, j);
        return j + SIZE;
    };

    static read(buffer: Buffer, j: number) {
        return [j + SIZE, new Float64Tag(buffer.readDoubleBE(j))];
    };
}

TagMatch[TagBytes.FLOAT64] = Float64Tag;