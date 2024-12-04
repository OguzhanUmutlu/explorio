import React from "react";
import {InventoryName, InventorySizes} from "@/meta/Inventories";
import {clientPlayer} from "@dom/Client";
import {Div, ReactState} from "@c/utils/Utils";
import {checkLag} from "@/utils/Utils";

const InventoryDivs: Record<string, [InventoryName, CanvasRenderingContext2D[], Div[]]> = {};

export function animateInventories() {
    checkLag("animate inventories", 10);

    const removed = {} as Record<InventoryName, Set<number>>;

    for (const key in InventoryDivs) {
        const [inventoryType, contexts, counts] = InventoryDivs[key];
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

            if (!item) {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                count.innerText = "";
                rm.add(index);
                continue;
            }

            if (item.render(ctx, 0, 0, ctx.canvas.width, ctx.canvas.height, false)) {
                rm.add(index);
            }

            count.innerText = item.count.toString();
        }
    }

    for (const k in removed) {
        const rm = removed[k];
        for (const index of rm) {
            const inv = clientPlayer.inventories[k as InventoryName];
            inv.dirtyIndexes.delete(index);
        }
    }

    checkLag("animate inventories", 10);
}

export default React.memo(function InventoryDiv(O: {
    inventoryType: InventoryName,
    ikey: string,
    handindex?: ReactState<number>,
    [k: string]: unknown
}) {
    const contexts = [] as CanvasRenderingContext2D[];
    const counts = [] as Div[];
    InventoryDivs[O.ikey] = [O.inventoryType, contexts, counts];
    const size = InventorySizes[O.inventoryType];
    const props = {...O};
    delete props.inventoryType;
    delete props.ikey;

    return <div className="inventory" key={O.ikey} {...props}>
        {...new Array(size).fill(null).map((_, i) => {
            return <div key={O.ikey + " " + i}
                        className={O.handindex && i === O.handindex[0] ? "inventory-item selected" : "inventory-item"}>
                <canvas ref={el => {
                    if (el) {
                        const ctx = contexts[i] = el.getContext("2d");
                        ctx.imageSmoothingEnabled = false;
                    }
                }}></canvas>
                <div ref={el => counts[i] = el}></div>
            </div>;
        })}
    </div>;
});