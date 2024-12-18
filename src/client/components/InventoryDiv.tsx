import React from "react";
import {CraftingMap, InventoryName, InventorySizes} from "@/meta/Inventories";
import {clientPlayer} from "@dom/Client";
import {ReactState, useEventListener} from "@c/utils/Utils";
import {checkLag} from "@/utils/Utils";
import {findCrafting, findCraftingFromInventory, inventoryToGrid} from "@/crafting/CraftingUtils";
import InventoryHandler from "@dom/components/InventoryHandler";

export const InventoryHandlers: Record<string, InventoryHandler> = {};

export function animateInventories() {
    checkLag("animate inventories", 10);

    const cursor = clientPlayer.cursorItem;
    const s = document.documentElement.style;
    s.setProperty("--item-empty-cursor", cursor ? "move" : "default");
    s.setProperty("--item-cursor", cursor ? "resize" : "grab");
    const updatedCraftingList = new Set<InventoryName>;

    InventoryHandler.removed = {};

    for (const handler of Object.values(InventoryHandlers)) {
        if (handler.animate()) updatedCraftingList.add(handler.inventoryName);
    }

    for (const k in InventoryHandler.removed) {
        const rm = InventoryHandler.removed[k];
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

let rightDown = false;

export default React.memo(function InventoryDiv(O: {
    inventoryName: InventoryName,
    ikey: string,
    handIndex?: ReactState<number>,
    [k: string]: unknown
}) {
    const handler = new InventoryHandler(O.inventoryName);
    InventoryHandlers[O.ikey] = handler;
    const size = InventorySizes[O.inventoryName];
    const props = {...O};
    delete props.inventoryName;
    delete props.ikey;
    delete props.handIndex;

    useEventListener("mousedown", (e: MouseEvent) => e.button === 2 && (rightDown = true));
    useEventListener("mouseup", (e: MouseEvent) => e.button === 2 && (rightDown = false));

    return <div className="inventory" key={O.ikey} {...props}>
        {...new Array(size).fill(null).map((_, i) => {
            return <div key={O.ikey + " " + i}
                        ref={el => handler.divs[i] = el}
                        className={O.handIndex && i === O.handIndex[0] ? "inventory-item selected" : "inventory-item"}
                        onMouseEnter={() => {
                            clientPlayer.hoveringIndex = i;
                            clientPlayer.hoveringInventory = O.inventoryName;
                            if (rightDown && clientPlayer.cursorItem) handler.rightClick(i, false);
                        }}
                        onMouseLeave={() => {
                            if (clientPlayer.hoveringIndex === i && O.inventoryName === clientPlayer.hoveringInventory) {
                                clientPlayer.hoveringIndex = -1;
                                clientPlayer.hoveringInventory = null;
                            }
                        }}
                        onMouseDown={e => {
                            handler.onClick(i, e.shiftKey, e.button);
                        }}>
                <canvas ref={el => {
                    if (el) {
                        const ctx = handler.contexts[i] = el.getContext("2d");
                        ctx.imageSmoothingEnabled = false;
                    }
                }}></canvas>
                <div ref={el => handler.counts[i] = el}></div>
            </div>;
        })}
    </div>;
});