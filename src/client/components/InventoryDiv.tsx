import React from "react";
import {
    CraftingInventoryNames,
    CraftingMap,
    CraftingMapFromResult,
    CraftingResultInventoryNames,
    InventoryName,
    InventorySizes
} from "@/meta/Inventories";
import {clientNetwork, clientPlayer} from "@dom/Client";
import {Div, ReactState} from "@c/utils/Utils";
import {checkLag} from "@/utils/Utils";
import {findCrafting, findCraftingFromInventory, inventoryToGrid} from "@/crafting/CraftingUtils";

const InventoryDivs: Record<string, [InventoryName, CanvasRenderingContext2D[], Div[], Div[]]> = {};

export function animateInventories() {
    checkLag("animate inventories", 10);

    const removed = {} as Record<InventoryName, Set<number>>;

    const cursor = clientPlayer.cursorItem;
    const s = document.documentElement.style;
    s.setProperty("--item-empty-cursor", cursor ? "move" : "default");
    s.setProperty("--item-cursor", cursor ? "resize" : "grab");
    const updatedCraftingList = new Set<InventoryName>;

    for (const key in InventoryDivs) {
        const [inventoryType, contexts, counts, divs] = InventoryDivs[key];
        const inventory = clientPlayer.inventories[inventoryType];
        if (inventory.wholeDirty) {
            for (let i = 0; i < contexts.length; i++) {
                inventory.dirtyIndexes.add(i);
            }

            inventory.wholeDirty = false;
        }

        const rm = removed[inventoryType] ??= new Set<number>;

        for (const index of inventory.dirtyIndexes) {
            const item = inventory.get(index);
            const ctx = contexts[index];
            const count = counts[index];
            const div = divs[index];

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

        if (inventory.dirtyIndexes.size > 0 && CraftingInventoryNames.includes(inventoryType)) {
            updatedCraftingList.add(inventoryType);
        }
    }

    for (const k in removed) {
        const rm = removed[k];
        for (const index of rm) {
            const inv = clientPlayer.inventories[k as InventoryName];
            inv.dirtyIndexes.delete(index);
        }
    }

    for (const k of updatedCraftingList) {
        // update the crafting result in client-side
        const inv = clientPlayer.inventories[k];
        const result = clientPlayer.inventories[CraftingMap[k]];
        const grid = inventoryToGrid(inv);
        const crafting = findCrafting(grid);

        result.set(0, crafting?.getResult(grid) || null);
    }

    checkLag("animate inventories", 10);
}

export function clientRemoveCrafts(invName: InventoryName) {
    const inv = clientPlayer.inventories[invName];
    const crafting = findCraftingFromInventory(inv);
    crafting.removeFrom(inv);
}

// you could technically set your time to the beginning of 1970, press E, click 1 item to trigger thrice-clicking
// 1) why would you do this, it isn't like advantageous, completely client-sided feature
// 2) why am I thinking of this
let lastTakeInv = 0;
let lastTakeInvIndex = -1;

export default React.memo(function InventoryDiv(O: {
    inventoryType: InventoryName,
    ikey: string,
    handindex?: ReactState<number>,
    [k: string]: unknown
}) {
    const contexts = [] as CanvasRenderingContext2D[];
    const counts = [] as Div[];
    const divs = [] as Div[];
    InventoryDivs[O.ikey] = [O.inventoryType, contexts, counts, divs];
    const size = InventorySizes[O.inventoryType];
    const props = {...O};
    delete props.inventoryType;
    delete props.ikey;

    return <div className="inventory" key={O.ikey} {...props}>
        {...new Array(size).fill(null).map((_, i) => {
            return <div key={O.ikey + " " + i}
                        ref={el => divs[i] = el}
                        className={O.handindex && i === O.handindex[0] ? "inventory-item selected" : "inventory-item"}
                        onMouseDown={e => {
                            const source = clientPlayer.inventories[O.inventoryType];
                            const clickedCraftResult = CraftingResultInventoryNames.includes(O.inventoryType);
                            const item = source.get(i)?.clone();
                            const cursor = clientPlayer.cursorItem;
                            const cursorInv = clientPlayer.inventories.cursor;
                            const accessible = clientPlayer.getAccessibleInventoryNames();
                            const shiftables = clientPlayer.getShiftableInventoryNames();

                            if (e.shiftKey) {
                                if (!item) return;

                                const shiftingTo: InventoryName[] = shiftables.length > 0 && !shiftables.includes(O.inventoryType)
                                    ? shiftables
                                    : (accessible.includes("player") ? ["hotbar", "player"] : ["hotbar"]);

                                let count = item.count;
                                const added: { inventory: InventoryName, index: number, count: number }[] = [];

                                for (const targetType of shiftingTo) {
                                    if (targetType === O.inventoryType) continue;
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
                                    clientNetwork.sendItemTransfer(O.inventoryType, i, added);
                                    source.decreaseItemAt(i, item.count - count);
                                } else {
                                    // undo everything because it failed
                                    for (let i = 0; i < added.length; i++) {
                                        const addition = added[i];
                                        const inv = clientPlayer.inventories[addition.inventory];
                                        inv.decreaseItemAt(addition.index, addition.count);
                                    }
                                }
                                return;
                            }

                            // Fun fact: You can write (item || cursor) && (!item || !cursor) as (+!!item^+!!cursor)
                            if (e.button === 2 && (item || cursor) && !clickedCraftResult) {
                                if (item && !cursor) {
                                    const gave = Math.round(item.count / 2);
                                    cursorInv.set(0, item.clone(gave));
                                    source.decreaseItemAt(i, gave);
                                    clientNetwork.sendItemTransfer(O.inventoryType, i, [{
                                        inventory: "cursor",
                                        index: 0,
                                        count: gave
                                    }]);
                                } else {
                                    if (item) source.increaseItemAt(i, 1);
                                    else source.set(i, cursor.clone(1));
                                    cursorInv.decreaseItemAt(0, 1);
                                    clientNetwork.sendItemTransfer("cursor", 0, [{
                                        inventory: O.inventoryType,
                                        index: i,
                                        count: 1
                                    }]);
                                }
                                return;
                            }

                            if (cursor) {
                                // putting cursor item down
                                if (clickedCraftResult) {
                                    // if it's possible, get more items from the craft result

                                    // not the same items
                                    if (!item || !item.equals(cursor, false, true)) return;

                                    // can't get all of them
                                    if (item.count + cursor.count > cursor.getMaxStack()) return;

                                    // got 'em
                                    cursorInv.increaseItemAt(0, item.count);

                                    // give a tick to the renderer
                                    clientPlayer.inventories[CraftingMapFromResult[O.inventoryType]].dirtyIndexes.add(0);

                                    clientNetwork.sendItemTransfer(O.inventoryType, 0, [{
                                        inventory: "cursor",
                                        index: 0,
                                        count: item.count
                                    }])
                                    return;
                                }
                                const maxStack = cursor.getMaxStack();
                                if (!item || (item.equals(cursor, false, true) && item.count < maxStack)) {
                                    const count = Math.min(maxStack - (item ? item.count : 0), cursor.count);
                                    if (item) source.increaseItemAt(i, count);
                                    else source.set(i, cursor.clone());
                                    cursorInv.decreaseItemAt(0, count);
                                    clientNetwork.sendItemTransfer("cursor", 0, [{
                                        inventory: O.inventoryType,
                                        index: i,
                                        count
                                    }]);
                                } else if (item) {
                                    cursorInv.set(0, item.clone());
                                    source.set(i, cursor.clone());
                                    clientNetwork.sendItemSwap("cursor", 0, O.inventoryType, i);
                                }
                            } else if (item) {
                                // taking items to cursor
                                if (Date.now() - lastTakeInv < 1000 && lastTakeInvIndex === i) {
                                    // clicked thrice, collect all the items like the ones in the cursor to the cursor
                                    let count = 0;
                                    const maxStack = item.getMaxStack();
                                    for (const invName of accessible) {
                                        if (count >= maxStack) break;
                                        const inv = clientPlayer.inventories[invName];
                                        for (let j = 0; j < inv.size; j++) {
                                            const item2 = inv.get(j);

                                            if (!item2 || !item2.equals(item, false, true)) continue;

                                            const moving = Math.min(maxStack - count, item2.count);
                                            count += moving;
                                            inv.decreaseItemAt(j, moving);

                                            clientNetwork.sendItemTransfer(invName, j, [{
                                                inventory: "cursor",
                                                index: 0,
                                                count: moving
                                            }]);

                                            if (count >= maxStack) {
                                                break;
                                            }
                                        }
                                    }

                                    if (count >= 0) cursorInv.set(0, item.clone(count));
                                    return;
                                }
                                lastTakeInv = Date.now();
                                lastTakeInvIndex = i;
                                cursorInv.set(0, item.clone());
                                source.set(i, null);
                                console.log(1)
                                clientNetwork.sendItemTransfer(O.inventoryType, i, [{
                                    inventory: "cursor",
                                    index: 0,
                                    count: item.count
                                }]);
                            }
                        }
                        }>
                <canvas ref={el => {
                    if (el) {
                        const ctx = contexts[i] = el.getContext("2d");
                        ctx.imageSmoothingEnabled = false;
                    }
                }}></canvas>
                <div ref={el => counts[i] = el}></div>
            </div>
                ;
        })
        }
    </div>
        ;
});