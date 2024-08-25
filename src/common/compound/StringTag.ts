import {BufferType, Tag, TagBytes} from "./Tag";
import {TagMatch} from "./TagManager";

export class StringTag extends Tag {
    constructor(public value: string) {
        super();
        this.apply(value);
    };

    getSize() {
        return 1 + (this.value.length > 255 ? 4 : 2) + this.value.length;
    };

    write(buffer: BufferType, j: number) {
        const len = this.value.length;
        buffer[j++] = len > 255 ? TagBytes.STRING_LONG : TagBytes.STRING;
        if (len > 255) buffer.writeUInt16BE(len, j);
        else buffer.writeUInt8(len, j);
        buffer.fill(this.value, j += len > 255 ? 4 : 2, j += len);
        return j;
    };

    apply(value: any) {
        if (typeof value !== "string") throw new Error("Tried to assign non-string to string tag");
        if (value.length > 65535) throw new Error(
            "Tried to assign string longer than 65535 characters to string tag, consider using legacy string tag");

        this.value = value;
        return this;
    };

    clone() {
        return new StringTag(this.value);
    };

    static read(buffer: BufferType, j: number) {
        const long = buffer[j - 1] === TagBytes.STRING_LONG;
        const length = long ? buffer.readUInt16BE(j) : buffer.readUInt8(j);
        j += long ? 4 : 2;
        return [j + length, new StringTag(buffer.slice(j, j + length).toString())];
    };
}

TagMatch[TagBytes.STRING] = StringTag;
TagMatch[TagBytes.STRING_LONG] = StringTag;