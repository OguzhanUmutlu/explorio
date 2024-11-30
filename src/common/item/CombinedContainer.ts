import Inventory from "$/item/Inventory";
import Item from "$/item/Item";

// This is for double chests etc.
export default class CombinedContainer extends Inventory {
    inventories: Inventory[];

    constructor(inventories: Inventory[] = [], extra: any = null) {
        const size = inventories.reduce((a, b) => a + b.size, 0);
        super(size, extra);
        this.inventories = inventories;
    };

    init() {
    };

    getContents() {
        const contents = [];
        for (let i = 0; i < this.inventories.length; i++) {
            contents.push(...this.inventories[i].getContents());
        }
        return contents;
    };

    get(index: number) {
        let ind = this.size;
        const invLs = this.inventories;
        for (let i = invLs.length - 1; i >= 0; i--) {
            const inv = invLs[i];
            ind -= inv.size;
            if (index >= ind) {
                return inv.get(index - ind);
            }
        }
        return null;
    };

    set(index: number, item: Item, update = true) {
        let ind = this.size;
        const invLs = this.inventories;
        for (let i = invLs.length - 1; i >= 0; i--) {
            const inv = invLs[i];
            ind -= inv.size;
            if (index >= ind) {
                inv.set(index - ind, item, update);
                if (update) this.dirtyIndexes.add(index);
                break;
            }
        }
    };

    clear() {
        this.cleanDirty = true;
        this.dirtyIndexes.clear();

        for (let i = 0; i < this.inventories.length; i++) {
            this.inventories[i].clear();
        }
    };
}