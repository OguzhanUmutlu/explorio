import React from "react";
import {Inventories, InventorySizes} from "@explorio/meta/Inventories";
import {clientPlayer} from "../Client";
import {Div} from "../js/utils/Utils";

const InventoryDivs: Record<string, [Inventories, HTMLCanvasElement[], Div[]]> = {};

export function animateInventories() {
    for (const key in InventoryDivs) {
        const [inventoryType, canvases, counts] = InventoryDivs[key];
        const inventory = clientPlayer[inventoryType];
        if (inventory.cleanDirty) {
            for (let i = 0; i < canvases.length; i++) {
                canvases[i].getContext("2d").clearRect(0, 0, canvases[i].width, canvases[i].height);
                counts[i].innerText = "";
            }
        }
        for (const index of inventory.dirtyIndexes) {
            const item = inventory.get(index);
            const canvas = canvases[index];
            const count = counts[index];
            if (!item) {
                canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
                count.innerText = "";
                continue;
            }
            item.render(canvas);
            count.innerText = item.count.toString();
        }
    }

    for (const key in InventoryDivs) {
        const inventory = clientPlayer[InventoryDivs[key][0]];
        inventory.cleanDirty = false;
        inventory.dirtyIndexes.clear();
    }
}

export default React.memo(function InventoryDiv(O: {
    inventoryType: Inventories,
    ikey: string,
    [_: string]: any
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