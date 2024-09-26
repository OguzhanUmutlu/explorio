import {Item, ItemDescriptor} from "./Item";
import {World} from "../world/World";
import {IM} from "../meta/ItemIds";

export class Inventory {
    cleanDirty = false;
    dirtyIndexes = new Set;
    // _tile: ContainerTile | null = null;
    private contents: (Item | null)[] = [];

    constructor(public size: number, public extra: any = null) {
        this.init();
    };

    init() {
        this.contents = new Array(this.size).fill(null);
    };

    checkAndCleanDirty() {
        if (this.cleanDirty || this.dirtyIndexes.size > 0) {
            this.cleanDirty = false;
            this.dirtyIndexes.clear();
            return true;
        }
        return false;
    }

    getContents() {
        return this.contents;
    };

    get(index: number): Item | null {
        return this.contents[index] || null;
    };

    set(index: number, item: Item | null, update = true) {
        this.contents[index] = item;
        if (update) this.dirtyIndexes.add(index);
    };

    clear() {
        this.cleanDirty = true;
        this.dirtyIndexes.clear();
        this.contents.fill(null);
    };

    add(item: Item) {
        if (!item) return;
        for (let i = 0; i < this.size; i++) {
            if (item.count === 0) return;
            this.addAt(i, item);
        }
    };

    remove(item: Item) {
        if (!item) return;
        for (let i = 0; i < this.size; i++) {
            if (item.count === 0) return;
            this.removeAt(i, item);
        }
    };

    addFromBack(item: Item) {
        if (!item) return;
        for (let i = this.size - 1; i >= 0; i--) {
            if (item.count === 0) return;
            this.addAt(i, item);
        }
    };

    removeFromBack(item: Item) {
        if (!item) return;
        for (let i = this.size - 1; i >= 0; i--) {
            if (item.count === 0) return;
            this.removeAt(i, item);
        }
    };

    removeDesc(desc: ItemDescriptor) {
        if (!desc) return;
        let count = desc.count ?? 1;
        if (Array.isArray(count)) throw new Error(".removeDesc() function cannot be ran with an item descriptor with multiple a bounded count.");
        for (let i = 0; i < this.size; i++) {
            if (count === 0) return 0;
            count = this.removeDescAt(i, desc, <number>count);
        }
        return count;
    };

    addAt(index: number, item: Item) {
        const maxStack = IM[item.id].maxStack;
        const it = this.get(index);
        if (!it) {
            const putting = Math.min(maxStack, item.count);
            item.count -= putting;
            this.set(index, item.clone(putting));
            return;
        }
        if (it.equals(item, false, true) && it.count < maxStack) {
            const putting = Math.min(maxStack - it.count, item.count);
            item.count -= putting;
            it.count += putting;
            this.dirtyIndexes.add(index);
            return;
        }
    };

    removeAt(index: number, item: Item) {
        if (!item) return;
        const it = this.get(index);
        if (!it || !it.equals(item, false, true)) return;
        if (it.count <= item.count) {
            this.removeIndex(index);
            item.count -= it.count;
            return;
        }
        it.count -= item.count;
        item.count = 0;
        this.dirtyIndexes.add(index);
        return;
    };

    removeDescAt(index: number, desc: ItemDescriptor, count: number) {
        const it = this.get(index);
        if (!it || !desc.equalsItem(it)) return count;
        if (it.count <= count) {
            this.removeIndex(index);
            return count - it.count;
        }
        it.count -= count;
        this.dirtyIndexes.add(index);
        return 0;
    };

    removeIndex(index: number) {
        this.set(index, null);
    };

    updateIndex(index: number) {
        const item = this.get(index);
        if (item && item.count <= 0) this.removeIndex(index);
        else this.dirtyIndexes.add(index);
    };

    damageItemAt(index: number, amount = 1, world: World | null = null, x = 0, y = 0) {
        const item = this.get(index);
        if (item) {
            const durability = IM[item.id].durability;
            item.nbt.damage ??= 0;
            if ((item.nbt.damage += amount) >= durability) {
                this.removeIndex(index);
                if (world) {
                    world.playSound("assets/sounds/random/break.ogg", x, y);
                }
            } else this.updateIndex(index);
        }
    };

    decreaseItemAt(index: number, amount = 1) {
        const item = this.get(index);
        if (item) {
            item.count -= amount;
            this.updateIndex(index);
        }
    };

    serialize() {
        return this.getContents().map(i => i ? i.serialize() : 0);
    };
}