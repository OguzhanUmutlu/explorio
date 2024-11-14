import {BM, I, ItemsByAccess} from "../meta/ItemIds";
import X from "stramp";
import {im2f} from "../meta/Items";
import {Canvas} from "../utils/Texture";

export class Item {
    constructor(
        public id: number,
        public meta: number = 0,
        public count: number = 1,
        public nbt: Record<string, any> = {}
    ) {
    };

    toMetadata() {
        return BM[im2f(this.id, this.meta)];
    };

    getTexture() {
        return this.toMetadata().getTexture();
    };

    render(canvas: Canvas) {
        const texture = this.getTexture();
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
    };

    toBuffer() {
        return ItemStruct.serialize(this);
    };

    static fromBuffer(buffer: Buffer) {
        return ItemStruct.deserialize(buffer);
    };

    equals(item: Item, count = true, nbt = true) {
        if (!item) return false;
        return item.id === this.id
            && item.meta === this.meta
            && (!count || item.count === this.count)
            && (!nbt || JSON.stringify(item.nbt) === JSON.stringify(this.nbt));
    };

    clone(count: number) {
        return new Item(this.id, this.meta, count ?? this.count, JSON.parse(JSON.stringify(this.nbt)))
    };

    static deserialize(data: any) {
        return data && data.id !== I.AIR ? new Item(data.id, data.meta, data.count, data.nbt) : null;
    };
}

export class ItemDescriptor {
    chance: number | null = null;

    constructor(
        public id: number,
        public meta: number | [number, number] | null = null,
        public count: number | [number, number] | null = null,
        public nbt: Record<string, any> | null = null
    ) {
    };

    setChance(chance: number | null) {
        this.chance = chance;
        return this;
    };

    equalsItem(item: Item) {
        if (!item) return false;
        return this.id === item.id
            && (this.meta === null || this.meta === item.meta)
            && (this.count === null || this.count === item.count)
            && (this.nbt === null || JSON.stringify(this.nbt) === JSON.stringify(item.nbt));
    };

    evaluate() {
        if (this.chance !== null && Math.random() > this.chance) return null;
        let meta = this.meta || 0;
        if (Array.isArray(meta)) meta = Math.floor(Math.random() * (meta[1] - meta[0] + 1)) + meta[0];
        let count = this.count || 1;
        if (Array.isArray(count)) count = Math.floor(Math.random() * (count[1] - count[0] + 1)) + count[0];
        return new Item(this.id, meta, count, this.nbt || {});
    };
}

export class ItemPool {
    chance: number;

    constructor(
        public things: (ItemDescriptor | ItemPool)[],
        public percentages: number[]
    ) {
    }

    setChance(chance: number | null) {
        this.chance = chance;
        return this;
    };

    select() {
        if (this.chance !== null && Math.random() > this.chance) return null;
        const percent = Math.floor(Math.random() * 100);
        let sum = 0;
        for (let i = 0; i < this.percentages.length; i++) {
            sum += this.percentages[i];
            if (percent < sum) return this.things[i];
        }
        return null;
    };

    evaluate() {
        const select = this.select();
        if (!select) return null;
        return select.evaluate();
    };

    static fromIdentifier(name: string) {
        return ItemsByAccess[name] || null;
    };
}

export const ItemStruct = X.object.struct({
    id: X.getTypeOf(I.__MAX__),
    meta: X.u8,
    count: X.u8,
    nbt: X.object
}).class(new Item(0), ({id, meta, count, nbt}) => new Item(id, meta, count, nbt));