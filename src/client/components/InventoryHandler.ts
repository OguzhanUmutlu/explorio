import {CraftingMap, CraftingResultMap, InventoryName} from "@/meta/Inventories";
import {clientNetwork, clientPlayer} from "@dom/Client";
import {Div} from "@c/utils/Utils";

let lastClicked = 0;
let clickedInv = "";
let clickedItemIndex = -1;
let clickCount = 0;

export default class InventoryHandler {
    static removed: Partial<Record<InventoryName, Set<number>>> = {};

    contexts: CanvasRenderingContext2D[] = [];
    counts: Div[] = [];
    divs: Div[] = [];

    constructor(public inventoryName: InventoryName) {
    };

    get inventory() {
        return clientPlayer.inventories[this.inventoryName];
    };

    shiftClick(index: number) {
        const source = this.inventory;
        const clickedCraftResult = this.inventoryName in CraftingResultMap;
        const item = source.get(index)?.clone();
        const accessible = clientPlayer.getAccessibleInventoryNames();
        const shiftables = clientPlayer.getShiftableInventoryNames();

        if (!item) return;

        const shiftingTo: InventoryName[] = shiftables.length > 0 && !shiftables.includes(this.inventoryName)
            ? shiftables
            : (accessible.includes("player") ? ["hotbar", "player"] : ["hotbar"]);

        let count = item.count;
        const added: { inventory: InventoryName, index: number, count: number }[] = [];

        for (const targetType of shiftingTo) {
            if (targetType === this.inventoryName) continue;
            if (count <= 0) break;
            const target = clientPlayer.inventories[targetType];
            for (let j = 0; j < target.size; j++) {
                const gave = target.addAt(j, item, count);

                if (gave > 0) {
                    added.push({inventory: targetType, index: j, count: gave});
                }

                count -= gave;

                if (count <= 0) break;
            }
        }

        // 1) has to transfer at least 1 item
        // 2) if it's a crafting result slot, it has to remove everything.
        if (count !== item.count && (!clickedCraftResult || count === 0)) {
            source.decreaseItemAt(index, item.count - count);
            clientNetwork.sendItemTransfer(this.inventoryName, index, added);
        } else {
            // undo everything because it failed
            for (let i = 0; i < added.length; i++) {
                const addition = added[i];
                const inv = clientPlayer.inventories[addition.inventory];
                inv.decreaseItemAt(addition.index, addition.count);
            }
        }

        return true;
    };

    rightClick(index: number, shift: boolean) {
        lastClicked = 0;
        clickedItemIndex = -1;
        clickedInv = "";
        clickCount = 0;
        if (shift) return this.shiftClick(index);

        const source = this.inventory;
        const item = source.get(index)?.clone();
        const cursor = clientPlayer.cursorItem;
        const clickedResult = this.inventoryName in CraftingResultMap;

        if ((!item && !cursor) || clickedResult) return false;

        if (item && !cursor) clientNetwork.makeItemTransfer(this.inventoryName, index, [{
            inventory: "cursor",
            index: 0,
            count: Math.round(item.count / 2)
        }]); else clientNetwork.makeItemTransfer("cursor", 0, [{
            inventory: this.inventoryName,
            index,
            count: 1
        }]);

        return true;
    };

    leftClickThrice(index: number) {
        const source = this.inventory;
        const item = source.get(index)?.clone();
        const accessible = clientPlayer.getAccessibleInventoryNames();

        // clicked thrice, collect all the items like the ones in the cursor to the cursor
        let count = 0;
        const maxStack = item.maxStack;
        for (const invName of accessible) {
            if (count >= maxStack) break;
            const inv = clientPlayer.inventories[invName];
            for (let j = 0; j < inv.size; j++) {
                const item2 = inv.get(j);

                if (!item2 || !item2.equals(item, false, true)) continue;

                const moving = Math.min(maxStack - count, item2.count);
                count += moving;

                clientNetwork.makeItemTransfer(invName, j, [{
                    inventory: "cursor",
                    index: 0,
                    count: moving
                }]);

                if (count >= maxStack) break;
            }
        }
    };

    leftClick(index: number, shift: boolean) {
        if (shift) {
            lastClicked = 0;
            clickedItemIndex = -1;
            clickedInv = "";
            clickCount = 0;
            return this.shiftClick(index);
        }

        const source = this.inventory;
        const clickedResult = this.inventoryName in CraftingResultMap;
        const item = source.get(index)?.clone();
        const cursor = clientPlayer.cursorItem;

        if (Date.now() - lastClicked > 500) {
            lastClicked = Date.now();
            clickedItemIndex = -1;
            clickedInv = "";
            clickCount = 0;
        }

        if (index !== clickedItemIndex || this.inventoryName !== clickedInv) {
            clickedItemIndex = index;
            clickedInv = this.inventoryName;
            clickCount = 1;
            lastClicked = Date.now();
        } else {
            clickCount++;
            if (clickCount >= 3 && item) {
                lastClicked = 0;
                clickedItemIndex = -1;
                clickedInv = "";
                clickCount = 0;
                return this.leftClickThrice(index);
            }
        }

        if (cursor) {
            // you are clicking to an item with an item in your cursor
            if (clickedResult) {
                // you are clicking a crafting result with an item in your cursor
                // if it's possible, get more items from the craft result to the cursor

                // not the same items
                if (!item || !item.equals(cursor, false, true) || item.count === cursor.count) return;

                // can't get all of them, so give up
                if (item.count + cursor.count > cursor.maxStack) return;

                clientNetwork.makeItemTransfer(this.inventoryName, 0, [{
                    inventory: "cursor",
                    index: 0,
                    count: item.count
                }])
                return;
            }
            const maxStack = cursor.maxStack;
            if (!item || (item.equals(cursor, false, true) && item.count < maxStack)) {
                const count = Math.min(maxStack - (item ? item.count : 0), cursor.count);

                clientNetwork.makeItemTransfer("cursor", 0, [{
                    inventory: this.inventoryName,
                    index, count
                }]);
            } else if (item) {
                clientNetwork.makeItemSwap("cursor", 0, this.inventoryName, index);
            }
        } else if (item) {
            // taking items to cursor
            clientNetwork.makeItemTransfer(this.inventoryName, index, [{
                inventory: "cursor",
                index: 0,
                count: item.count
            }]);
        }
    };

    onClick(index: number, shift: boolean, button: number) {
        if (button === 2 && this.rightClick(index, shift)) return;
        if (button === 0 && this.leftClick(index, shift)) return;
    };

    hasUpdatedCrafting() {
        return clientPlayer.inventories[this.inventoryName].dirtyIndexes.size > 0 && (this.inventoryName in CraftingMap);
    };

    render() {
        const inventory = clientPlayer.inventories[this.inventoryName];

        if (inventory.wholeDirty) {
            for (let i = 0; i < this.contexts.length; i++) {
                inventory.dirtyIndexes.add(i);
            }

            inventory.wholeDirty = false;
        }

        const rm = InventoryHandler.removed[this.inventoryName] ??= new Set<number>;

        for (const index of inventory.dirtyIndexes) {
            const item = inventory.get(index);
            const ctx = this.contexts[index];
            const count = this.counts[index];
            const div = this.divs[index];

            div.classList[item ? "remove" : "add"]("item-empty");

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            if (!item) {
                count.innerText = "";
                rm.add(index);
                continue;
            }

            if (item.render(ctx, 0, 0, ctx.canvas.width, ctx.canvas.height, false)) {
                rm.add(index);
            }

            count.innerText = item.count <= 1 ? "" : item.count.toString();
        }
    };
}