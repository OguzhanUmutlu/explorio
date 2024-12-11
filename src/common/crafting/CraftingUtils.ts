import {ShapelessCrafting} from "@/crafting/ShapelessCrafting";
import {default as ID} from "@/item/ItemDescriptor";
import {I} from "@/meta/ItemIds";
import Item from "@/item/Item";
import Inventory from "@/item/Inventory";
import {Crafting} from "@/crafting/Crafting";
import {ShapedCrafting} from "@/crafting/ShapedCrafting";

export const CraftingList: Crafting[] = [];

for (let meta = 0; meta < 6; meta++) {
    CraftingList.push(
        new ShapelessCrafting([new ID(I.LOG, meta)], new ID(I.PLANKS, meta, 4)),
        ShapedCrafting.simple([
            `AA`,
            `AA`
        ], {"A": new ID(I.PLANKS, meta)}, new ID(I.CRAFTING_TABLE))
    );
}

// Assuming it's square.
export function inventoryToGrid(inventory: Inventory) {
    const contents = inventory.getContents();
    const size = Math.sqrt(contents.length);
    const newContents = <(Item | null)[][]>new Array(size).fill(null).map(() => new Array(size).fill(null));

    for (let i = 0; i < contents.length; i++) {
        const x = Math.floor(i / size);
        const y = i % size;
        newContents[x][y] = contents[i];
    }

    return newContents;
}

// Assuming it's square.
export function findCraftingFromInventory(inventory: Inventory) {
    return findCrafting(inventoryToGrid(inventory));
}

export function findCrafting(contents: (Item | null)[][]) {
    compressNulls(contents);

    for (let i = 0; i < CraftingList.length; i++) {
        const crafting = CraftingList[i];
        if (crafting.validate(contents)) return crafting;
    }

    return null;
}

// This function tries to trim up null rows and columns from top and left of the 2d array.
// Essentially pushing everything to left top corner.
// Input: [
//  [null, null, null],
//  [null, null,  1  ],
//  [null, null,  2  ]
// ]
// Output:
// [
//  [ 1  , null, null],
//  [ 2  , null, null],
//  [null, null, null]
// ]
export function compressNulls<T>(contents: T[][]) {
    const rows = contents.length;
    const cols = contents[0]?.length || 0;

    if (rows === 0 || cols === 0) return;

    let emptyUntilRow = 0;
    for (let i = 0; i < rows; i++) {
        let found = false;
        const row = contents[i];
        for (let j = 0; j < cols; j++) {
            if (row[j] !== null) {
                found = true;
                break;
            }
        }

        if (found) {
            emptyUntilRow = i;
            break;
        }
    }

    if (emptyUntilRow !== 0) for (let i = emptyUntilRow; i < rows; i++) {
        const row = contents[i];
        for (let j = 0; j < cols; j++) {
            contents[i - emptyUntilRow][j] = row[j];
            row[j] = null;
        }
    }

    let emptyUntilColumn = 0;
    for (let i = 0; i < cols; i++) {
        let found = false;
        for (let j = 0; j < rows; j++) {
            if (contents[j][i] !== null) {
                found = true;
                break;
            }
        }

        if (found) {
            emptyUntilColumn = i;
            break;
        }
    }

    if (emptyUntilColumn !== 0) for (let i = 0; i < rows; i++) {
        const row = contents[i];
        for (let j = emptyUntilColumn; j < cols; j++) {
            row[j - emptyUntilColumn] = row[j];
            row[j] = null;
        }
    }

    // Returns how many rows and columns were deleted.
    return [emptyUntilRow, emptyUntilColumn];
}