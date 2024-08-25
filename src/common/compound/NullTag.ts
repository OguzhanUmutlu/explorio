import {BufferType, Tag, TagBytes} from "./Tag";
import {TagMatch} from "./TagManager";

export class NullTag extends Tag {
    value = null;

    getSize() {
        return 1;
    };

    write(buffer: BufferType, j: number) {
        buffer[j++] = TagBytes.NULL;
        return j;
    };

    apply(_: null) {
        return this;
    };

    clone() {
        return new NullTag();
    };

    static read(_: BufferType, j: number) {
        return [j + 1, new NullTag()];
    };
}

TagMatch[TagBytes.NULL] = NullTag;