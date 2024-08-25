import {BufferType, TagBytes} from "../Tag";
import {TagMatch} from "../TagManager";
import {Item} from "../../Item";
import {ObjectTag} from "../Object";
import {Int8Tag} from "../int/Int8Tag";
import {StringTag} from "../StringTag";

export class ItemTag extends ObjectTag {
    static SIGN = TagBytes.ITEM;

    tags = {
        id: new Int8Tag(0),
        meta: new Int8Tag(0),
        count: new Int8Tag(0),
        nbt: new StringTag("{}") // todo: make nbt fixed, somehow.
    };

    constructor(value: Item) {
        super();
        this.apply(value);
    };

    get value() {
        const obj = super.value;
        return new Item(obj.id, obj.meta, obj.count, JSON.parse(obj.nbt));
    };

    apply(item: any) {
        if (!(item instanceof Item)) {
            if (item !== null && typeof item === "object") return super.apply(item);
            throw new Error("Tried to apply non-item to item tag");
        }
        return super.apply({
            id: item.id,
            meta: item.meta,
            count: item.count,
            nbt: JSON.stringify(item.nbt)
        });
    };

    static read(buffer: BufferType, j: number) {
        return ObjectTag.read(buffer, j, ItemTag);
    };
}

TagMatch[TagBytes.ITEM] = ItemTag;