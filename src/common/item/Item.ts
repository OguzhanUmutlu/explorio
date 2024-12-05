import {BM} from "@/meta/ItemIds";
import {im2f} from "@/meta/Items";
import ItemStruct from "@/structs/item/ItemStruct";
import {ItemNBT} from "@/structs/item/ItemNBTStruct";

export default class Item {
    constructor(
        public id: number,
        public meta: number = 0,
        public count: number = 1,
        public nbt: ItemNBT = {}
    ) {
    };

    toMetadata() {
        return BM[im2f(this.id, this.meta)];
    };

    getTexture() {
        return this.toMetadata().getTexture();
    };

    render(ctx: CanvasRenderingContext2D, x = 0, y = 0, w = ctx.canvas.width, h = w, waitToLoad = true) {
        return this.toMetadata().render(ctx, x, y, w, h, waitToLoad);
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
}