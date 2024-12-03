import React from "react";
import {InventoryName, InventorySizes} from "@/meta/Inventories";
import {clientPlayer} from "@dom/Client";
import {Div} from "@c/utils/Utils";
import {checkLag} from "@/utils/Utils";

const InventoryDivs: Record<string, [InventoryName, HTMLCanvasElement[], Div[]]> = {};

export function animateInventories() {
    checkLag("animate inventories", 10);

    const removed = {} as Record<InventoryName, Set<number>>;

    for (const key in InventoryDivs) {
        const [inventoryType, canvases, counts] = InventoryDivs[key];
        const inventory = clientPlayer.inventories[inventoryType];
        if (inventory.wholeDirty) {
            for (let i = 0; i < canvases.length; i++) {
                inventory.dirtyIndexes.add(i);
            }

            inventory.wholeDirty = false;
        }

        const rm = removed[inventoryType] ??= new Set<number>;

        for (const index of inventory.dirtyIndexes) {
            const item = inventory.get(index);
            const canvas = canvases[index];
            const count = counts[index];

            if (!item) {
                canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
                count.innerText = "";
                rm.add(index);
                continue;
            }

            if (item.render(canvas)) {
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
    [k: string]: unknown
}) {
    const canvases = [] as HTMLCanvasElement[];
    const counts = [] as Div[];
    InventoryDivs[O.ikey] = [O.inventoryType, canvases, counts];
    const size = InventorySizes[O.inventoryType];
    const props = {...O};
    delete props.inventoryType;
    delete props.ikey;

    return <div className="inventory" key={O.ikey} {...props}>
        {...new Array(size).fill(null).map((_, i) => <div key={O.ikey + " " + i} className="inventory-item">
            <canvas ref={el => canvases[i] = el}></canvas>
            <div ref={el => counts[i] = el}></div>
        </div>)}
    </div>;
});