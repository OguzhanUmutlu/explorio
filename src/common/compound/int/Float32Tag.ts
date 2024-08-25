import {TagBytes} from "../Tag";
import {TagMatch} from "../TagManager";
import {BaseNumberTag} from "./BaseNumberTag";

const SIZE = 4;

export class Float32Tag extends BaseNumberTag {
    getSize() {
        return 1 + SIZE;
    };

    write(buffer: Buffer, j: number) {
        buffer[j++] = TagBytes.FLOAT32;
        buffer.writeFloatBE(this.value, j);
        return j + SIZE;
    };

    static read(buffer: Buffer, j: number) {
        return [j + SIZE, new Float32Tag(buffer.readFloatBE(j))];
    };
}

TagMatch[TagBytes.FLOAT32] = Float32Tag;