import {ItemsByAccess} from "@/meta/ItemIds";
import ItemDescriptor from "@/item/ItemDescriptor";

export default class ItemPool {
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