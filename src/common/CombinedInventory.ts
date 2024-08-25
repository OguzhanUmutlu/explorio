import {Inventory} from "./Inventory";

// This is for double chests etc.
export class CombinedInventory extends Inventory {
    inventories: Inventory[];

    constructor(type: number, inventories: Inventory[] = [], extra: any = null) {
        const size = inventories.reduce((a, b) => a + b.size, 0);
        super(size, type, extra);
        this.inventories = inventories;
    };

    init() {
    };

    getContents() {
        const contents = [];
        for (const inv of this.inventories) contents.push(...inv.getContents());
        return contents;
    };

    get(index) {
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

    set(index, item, update = true) {
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
        for (const inv of this.inventories) inv.clear();
    };
}