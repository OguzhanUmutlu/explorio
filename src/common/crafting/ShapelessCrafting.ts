import {Crafting} from "@/crafting/Crafting";
import Item from "@/item/Item";
import {default as ID} from "@/item/ItemDescriptor";
import Inventory from "@/item/Inventory";

export class ShapelessCrafting extends Crafting {
    constructor(public items: ID[], public result: ID) {
        super();
    };

    validate(_contents: (Item | null)[][]): boolean {
        const contents = <(Item | null)[]>[].concat(..._contents).filter(i => i !== null);
        if (contents.length !== this.items.length) return false;

        for (let i = 0; i < this.items.length; i++) {
            const id = this.items[i];
            let any = false;
            for (let j = 0; j < contents.length; j++) {
                const item = contents[j];
                if (id.equalsItem(item)) {
                    any = true;
                    contents.splice(j, 1);
                    break;
                }
            }
            if (!any) return false;
        }

        return contents.length === 0;
    };

    getResult(): Item | null {
        return this.result.evaluate();
    };

    removeFrom(inventory: Inventory) {
        for (let i = 0; i < this.items.length; i++) {
            const id = this.items[i];
            inventory.removeDesc(id);
        }
    };
}