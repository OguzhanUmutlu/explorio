import {BufferType, Tag, TagBytes} from "./Tag";
import {TagMatch} from "./TagManager";

export class BoolTag extends Tag {
    constructor(public value: boolean) {
        super();
        this.apply(value);
    };

    getSize() {
        return 1;
    };

    write(buffer: BufferType, j: number) {
        buffer[j++] = this.value ? TagBytes.TRUE : TagBytes.FALSE;
        return j;
    };

    apply(value: any) {
        if (typeof value !== "boolean") throw new Error("Tried to apply non-boolean to bool tag");
        this.value = value;
        return this;
    };

    clone() {
        return new BoolTag(this.value);
    };

    static read(buffer: BufferType, j: number) {
        return [j, new BoolTag(buffer[j - 1] === TagBytes.TRUE)];
    };
}

TagMatch[TagBytes.TRUE] = BoolTag;
TagMatch[TagBytes.FALSE] = BoolTag;