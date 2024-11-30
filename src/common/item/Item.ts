import {BM, I} from "$/meta/ItemIds";
import {im2f} from "$/meta/Items";
import {Canvas} from "$/utils/Texture";
import ItemStruct from "$/structs/item/ItemStruct";

export default class Item {
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