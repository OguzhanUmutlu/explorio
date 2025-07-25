import {im2f} from "@/meta/ItemInformation";
import ItemStruct from "@/structs/item/ItemStruct";
import {ItemComponents} from "@/structs/item/ItemComponentsStruct";
import {f2data} from "@/item/ItemFactory";

export const DefaultItemComponents: ItemComponents = {
    damage: 0
};

export default class Item {
    maxStack: number;
    components: ItemComponents;

    constructor(
        public id: number,
        public meta: number = 0,
        public count: number = 1,
        components: Partial<ItemComponents> = {}
    ) {
        this.components = {...DefaultItemComponents, ...components}
        this.maxStack = this.toMetadata().maxStack;
    };

    get fullId() {
        return im2f(this.id, this.meta);
    };

    toMetadata() {
        return f2data(this.fullId);
    };

    getTexture() {
        return this.toMetadata().getItemTexture();
    };

    render(ctx: CanvasRenderingContext2D, x = 0, y = 0, w = ctx.canvas.width, h = w, waitToLoad = true) {
        return this.toMetadata().renderItem(ctx, x, y, w, h, waitToLoad);
    };

    toBuffer() {
        return ItemStruct.serialize(this);
    };

    static fromBuffer(buffer: Buffer) {
        return ItemStruct.deserialize(buffer);
    };

    equals(item: Item, count = true, components = true) {
        if (!item) return false;
        return item.id === this.id
            && item.meta === this.meta
            && (!count || item.count === this.count)
            && (!components || JSON.stringify(item.components) === JSON.stringify(this.components));
    };

    clone(count = this.count) {
        return new Item(this.id, this.meta, count ?? this.count, JSON.parse(JSON.stringify(this.components)))
    };
}