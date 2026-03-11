import {im2f} from "@/meta/ItemInformation";
import type {ItemComponents} from "@/structs/ItemStructs";
import {f2data} from "@/item/ItemFactory";

export const DefaultItemComponents: ItemComponents = {
    damage: 0,
    enchantments: [],
    displayName: null,
    description: null,
    customData: null
};

export class Item {
    count: number;
    components: ItemComponents;
    maxStack: number;

    constructor(
        public id: number,
        public meta: number = 0,
        count: number = 1,
        components: Partial<ItemComponents> = {}
    ) {
        this.count = count;
        this.components = {...DefaultItemComponents, ...components}
        this.maxStack = this.toMetadata().maxStack;
    };

    get identifier() {
        return this.toMetadata().identifier;
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