import {AnyTag, BufferType, Tag, TagBytes} from "./Tag";
import {TagMatch} from "./TagManager";

export class ListTag extends Tag {
    constructor(public tags: AnyTag[] = []) {
        super();
    };

    get value() {
        const list: any[] = [];
        for (let i = 0; i < this.tags.length; i++) {
            list.push(this.tags[i].value);
        }
        return list;
    };

    getSize(): number {
        return 1 + this.tags.reduce((a, b) => a + b.getSize(), 0) + 1;
    };

    serialize() {
        const list: any[] = [];
        for (let i = 0; i < this.tags.length; i++) {
            list.push(this.tags[i].serialize());
        }
        return list;
    };

    write(buffer: BufferType, j: number) {
        buffer[j++] = TagBytes.LIST;
        for (let i = 0; i < this.tags.length; i++) {
            j = this.tags[i].write(buffer, j);
        }
        buffer[j++] = TagBytes.BREAK;
        return j;
    };

    apply(list: any[]) {
        if (!Array.isArray(list)) throw new Error("Tried to apply non-array to list tag.");
        const len = Math.min(this.tags.length, list.length);
        for (let i = 0; i < len; i++) {
            this.tags[i].apply(list[i]);
        }
        return this;
    };

    clone() {
        const tag = new ListTag;
        for (let i = 0; i < this.tags.length; i++) {
            tag.tags.push(this.tags[i].clone());
        }
        return tag;
    };

    push(tag: Tag) {
        this.tags.push(tag);
    };

    static read(buffer: BufferType, j: number) {
        const tag = new ListTag;
        while (true) {
            if (j >= buffer.length) throw new Error("Unexpected end of list tag.");
            if (buffer[j] === TagBytes.BREAK) break;
            const r = Tag.readAny(buffer, j);
            j = r[0];
            tag.tags.push(r[1]);
        }
        return [j + 1, tag];
    };
}

TagMatch[TagBytes.LIST] = ListTag;