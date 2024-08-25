import {TagBytes} from "../Tag";
import {TagMatch} from "../TagManager";
import {ObjectTag} from "../Object";
import {Int8Tag} from "../int/Int8Tag";
import {ListTag} from "../ListTag";
import {ItemTag} from "./ItemTag";
import {NullTag} from "../NullTag";
import {Item} from "../../Item";
import {Inventory} from "../../Inventory";

export class InventoryTag extends ObjectTag {
    static SIGN = TagBytes.INVENTORY;

    tags = {
        size: new Int8Tag(0),
        type: new Int8Tag(0),
        contents: new ListTag
    };

    constructor(value: Inventory) {
        super();
        this.apply(value);
    };

    serialize() {
        return super.serialize();
    }

    // noinspection JSCheckFunctionSignatures
    get value() {
        const inv = new Inventory(this.tags.size.value, this.tags.type.value);
        const con = this.tags.contents.value;
        for (let i = 0; i < con.length; i++) {
            inv.set(i, Item.deserialize(con[i]));
        }
        return inv;
    };

    apply(inventory: any) {
        if (!(inventory instanceof Inventory)) {
            if (inventory !== null && typeof inventory === "object") return super.apply(inventory);
            throw new Error("Tried to apply non-inventory to inventory tag");
        }
        this.tags.contents = new ListTag(inventory.getContents().map(i => i ? new ItemTag(i) : new NullTag()));
        super.apply({
            size: inventory.size,
            type: inventory.type
        });
        return this;
    };

    static read(buffer: Buffer, j: number, cls = InventoryTag) {
        return ObjectTag.read(buffer, j, cls);
    };
}

TagMatch[TagBytes.INVENTORY] = InventoryTag;