import {Item} from "@/item/Item";

export class ItemDescriptor {
    chance: number | null = null;

    constructor(
        public id: number,
        public meta: number | [number, number] | null = null,
        public count: number | [number, number] | null = null,
        public components: object | null = null
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
            && (this.components === null || JSON.stringify(this.components) === JSON.stringify(item.components));
    };

    evaluate(): Item | null {
        if (this.chance !== null && Math.random() > this.chance) return null;
        let meta = this.meta || 0;
        if (Array.isArray(meta)) meta = Math.floor(Math.random() * (meta[1] - meta[0] + 1)) + meta[0];
        let count = this.count || 1;
        if (Array.isArray(count)) count = Math.floor(Math.random() * (count[1] - count[0] + 1)) + count[0];
        return new Item(this.id, meta, count, this.components || {});
    };
}