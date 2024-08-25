import {AnyTag, BufferType, Tag, TagBytes} from "./Tag";
import {TagMatch} from "./TagManager";

export class ObjectTag extends Tag {
    constructor(public tags: Record<string, AnyTag> = {}, public byte: number = TagBytes.OBJECT) {
        super();
    };

    get value() {
        const obj: Record<string, any> = {};
        const keys = Object.keys(this.tags);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            obj[k] = this.tags[k].value;
        }
        return obj;
    };

    serialize() {
        const obj: Record<string, any> = {};
        const keys = Object.keys(this.tags);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            obj[k] = this.tags[k].serialize();
        }
        return obj;
    };

    getTag(key: string) {
        return this.tags[key];
    };

    getTagValue(key: string) {
        return this.tags[key].value;
    };

    setTag(key: string, value: AnyTag) {
        this.tags[key] = value;
        return this;
    };

    removeTag(key: string) {
        delete this.tags[key];
        return this;
    };

    getSize(): number {
        return 1 + Object.keys(this.tags).reduce((a, b) => a + b.length + 1, 0)
            + Object.values(this.tags).reduce((a, b) => a + b.getSize(), 0) + 1;
    };

    write(buffer: BufferType, j: number) {
        buffer[j++] = this.byte;
        const keys = Object.keys(this.tags);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            buffer.fill(k, j, j += k.length);
            buffer[j++] = 0;
            j = this.tags[k].write(buffer, j);
        }
        buffer[j++] = TagBytes.BREAK;
        return j;
    };

    apply(object: Record<string, any>) {
        if (typeof object !== "object" || object === null) throw new Error("Tried to apply non-object to object tag");
        const keys = Object.keys(this.tags);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (!(k in object)) continue;
            this.tags[k].apply(object[k]);
        }
        return this;
    };

    applyTo(target: Record<string, AnyTag>, ignore: string[] = []) {
        const keys = Object.keys(this.tags);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (ignore.includes(k)) continue;
            target[k] = this.tags[k].value;
        }
        return target;
    };

    clone() {
        const tag = new (<any>this.constructor);
        const keys = Object.keys(this.tags);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            tag.tags[k] = this.tags[k].clone();
        }
        return tag;
    };

    combine(objectTag: ObjectTag) {
        Object.assign(this.tags, objectTag.tags);
        return this;
    };

    static read(buffer: BufferType, j: number, cls: any = ObjectTag): [number, AnyTag] {
        const tag = <any>new cls;
        while (true) {
            if (j >= buffer.length) throw new Error("Unexpected end of object tag.");
            let key = "";
            while (true) {
                if (buffer[j] === 0 || buffer[j] === TagBytes.BREAK) break;
                if (j === buffer.length - 1) throw new Error("Unexpected end of object tag's key.");
                key += String.fromCharCode(buffer[j]);
                j++;
            }
            if (buffer[j] === TagBytes.BREAK) break;
            j++;
            if (buffer[j] === TagBytes.BREAK) break;
            [j, tag.tags[key]] = Tag.readAny(buffer, j);
            if (buffer[j] === TagBytes.BREAK) break;
        }
        return [j + 1, tag];
    };
}

TagMatch[TagBytes.OBJECT] = ObjectTag;