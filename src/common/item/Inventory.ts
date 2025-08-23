import {Item} from "@/item/Item";
import {World} from "@/world/World";
import {im2data} from "@/item/ItemFactory";
import {ItemDescriptor} from "@/item/ItemDescriptor";

export class Inventory {
    wholeDirty = false;
    dirtyIndexes = new Set<number>;
    // _tile: ContainerTile | null = null;
    private contents: (Item | null)[] = [];

    constructor(public readonly size: number, public readonly name: string) {
        this.contents = new Array(this.size).fill(null);
        // @ts-expect-error This is just a property I wanted to set.
        this.contents.__belongsTo = this;
    };

    getContents() {
        return this.contents;
    };

    setContents(items: Item[]) {
        this.contents = items;
        this.contents.length = this.size;
        this.wholeDirty = true;
        return this;
    };

    get(index: number): Item | null {
        return this.contents[index] || null;
    };

    set(index: number, item: Item | null, update = true) {
        if (item && item.count === 0) item = null;
        this.contents[index] = item;
        if (update) this.dirtyIndexes.add(index);
    };

    clear() {
        this.wholeDirty = true;
        this.dirtyIndexes.clear();
        this.contents.fill(null);
    };

    add(item: Item, count = item?.count || 0) {
        if (!item || item.count === 0 || count === 0) return count;
        for (let i = 0; i < this.size; i++) {
            count -= this.addAt(i, item, count);
            if (count === 0) return 0;
        }

        return count;
    };

    remove(item: Item, count = item?.count || 0) {
        if (!item || item.count === 0 || count === 0) return count;
        for (let i = 0; i < this.size; i++) {
            count -= this.removeAt(i, item, count);
            if (count === 0) return 0;
        }

        return count;
    };

    addFromBack(item: Item, count = item?.count || 0) {
        if (!item || item.count === 0 || count === 0) return count;
        for (let i = this.size - 1; i >= 0; i--) {
            count -= this.addAt(i, item, count);
            if (count === 0) return 0;
        }

        return count;
    };

    removeFromBack(item: Item, count = item?.count || 0) {
        if (!item || item.count === 0 || count === 0) return count;
        for (let i = this.size - 1; i >= 0; i--) {
            count -= this.removeAt(i, item, count);
            if (count === 0) return 0;
        }

        return count;
    };

    removeDesc(desc: ItemDescriptor) {
        if (!desc) return 0;
        let count = desc.count ?? 1;
        if (Array.isArray(count)) throw new Error(".removeDesc() function cannot be ran with an item descriptor with a multiple bounded count.");

        for (let i = 0; i < this.size; i++) {
            if (count === 0) return 0;
            count = this.removeDescAt(i, desc, count);
        }

        return count;
    };

    addAt(index: number, item: Item, count = item?.count || 0) {
        const mt = im2data(item.id);
        if (!mt) printer.error("Item not found:", item.id)
        const maxStack = mt.maxStack;
        const it = this.get(index);

        if (!it) {
            const putting = Math.min(maxStack, count);
            this.set(index, item.clone(putting));
            return putting;
        }

        if (it.equals(item, false, true) && it.count < maxStack) {
            const putting = Math.min(maxStack - it.count, count);
            it.count += putting;
            this.dirtyIndexes.add(index);
            return putting;
        }

        return 0;
    };

    removeAt(index: number, item: Item, count = item?.count || 0) {
        const it = this.get(index);
        if (!item || !it || !it.equals(item, false, true)) return count;

        if (it.count <= count) {
            this.removeIndex(index);
            return it.count;
        }

        it.count -= count;
        this.dirtyIndexes.add(index);
        return count;
    };

    removeDescAt(index: number, desc: ItemDescriptor, count = desc.count ?? 1) {
        if (Array.isArray(count)) throw new Error(".removeDescAt() function cannot be ran with an item descriptor with a multiple bounded count.");

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

    transfer(from: number, target: Inventory, to: number, count: number) {
        const fromItem = this.get(from);
        const toItem = target.get(to);

        if (count === 0) return null; // transfer count is 0

        if (!fromItem || fromItem.id === 0) return null; // source is empty

        if (fromItem.count < count) return null; // source is not sufficient

        const sameItem = fromItem.equals(toItem, false, true);
        if (toItem && !sameItem) return null; // the source item and the target item were not the same

        if (toItem && toItem.count + count > toItem.maxStack) return null; // count is too much and overflows

        const alrThis = this.dirtyIndexes.has(from);
        const alrTar = target.dirtyIndexes.has(to);

        if (sameItem) {
            const item = this.get(from);
            const c = item.count;
            this.decreaseItemAt(from, count);
            target.increaseItemAt(to, count);

            return () => {
                // undo.
                // I used set instead of increase because it might be completely gone as it has been decreased.
                this.set(from, item.clone(c));
                target.decreaseItemAt(to, count);
                if (!alrThis) this.dirtyIndexes.delete(from);
                if (!alrTar) target.dirtyIndexes.delete(to);
            };
        }

        // here, target is empty.

        this.set(from, fromItem.clone(fromItem.count - count));
        target.set(to, fromItem.clone(count));

        return () => {
            this.set(from, fromItem.clone(fromItem.count));
            // re-empty target
            target.set(to, null);
            if (!alrThis) this.dirtyIndexes.delete(from);
            if (!alrTar) target.dirtyIndexes.delete(to);
        };
    };

    updateIndex(index: number) {
        const item = this.get(index);
        if (item && item.count <= 0) this.removeIndex(index);
        else this.dirtyIndexes.add(index);
    };

    damageItemAt(index: number, amount = 1, world: World | null = null, x = 0, y = 0) {
        const item = this.get(index);
        if (item) {
            const durability = im2data(item.id).durability;
            if (durability > 0) {
                item.components.damage ??= 0;
                if ((item.components.damage += amount) >= durability) {
                    this.removeIndex(index);
                    if (world) {
                        world.playSound("assets/sounds/random/break.ogg", x, y);
                    }
                } else this.updateIndex(index);
            }
        }
    };

    private increaseItemAt(index: number, amount = 1) { // too risky, might overflow
        const item = this.get(index);
        if (item) {
            item.count += amount;

            if (item.count <= 0) return this.removeIndex(index);
            if (item.count >= item.maxStack) item.count = item.maxStack;

            this.updateIndex(index);
        }
    };

    decreaseItemAt(index: number, amount = 1) {
        this.increaseItemAt(index, -amount);
    };
}