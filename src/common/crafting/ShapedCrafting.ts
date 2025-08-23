import {Crafting} from "@/crafting/Crafting";
import {Item} from "@/item/Item";
import {ItemDescriptor as ID} from "@/item/ItemDescriptor";
import {Inventory} from "@/item/Inventory";
import {compressNulls, inventoryToGrid} from "@/crafting/CraftingUtils";

export class ShapedCrafting extends Crafting {
    constructor(public items: (ID | null)[][], public result: ID) {
        super();
    };

    validate(contents: (Item | null)[][]): boolean {
        const contRows = contents.length;
        const contCols = contents[0].length;

        const rows = this.items.length;
        const cols = this.items[0].length;

        if (contRows < rows || contCols < cols) return false; // needs a bigger crafting table

        for (let i = 0; i < contRows; i++) {
            const lineContents = contents[i];
            const lineTarget = this.items[i] ?? [];
            for (let j = 0; j < contCols; j++) {
                const id = lineTarget[j] ?? null;
                const item = lineContents[j];
                if (id === null && item === null) continue;
                if (id === null || !id.equalsItem(item)) return false;
            }
        }

        return true;
    };

    getResult(): Item | null {
        return this.result.evaluate();
    };

    removeFrom(inventory: Inventory) {
        const itemsRows = this.items.length;
        const itemsCols = this.items[0].length;

        const invLen = Math.sqrt(inventory.size);

        const itemsFlat = <(ID | null)[]>[].concat(...this.items);
        const grid = inventoryToGrid(inventory);
        const [deletedRows, deletedCols] = compressNulls(grid); // changes the value of grid!!!
        // shifted rows up by deletedRows, shifted cols left by deletedCols

        for (let i = 0; i < itemsRows; i++) {
            for (let j = 0; j < itemsCols; j++) {
                const id = itemsFlat[i * itemsCols + j];
                if (id === null) continue;
                const row = i + deletedRows;
                const col = j + deletedCols;
                const actualIndexInInventory = row * invLen + col;
                inventory.removeDescAt(actualIndexInInventory, id);
            }
        }

        /*for (let i = 0; i < this.items.length; i++) {
            const row = this.items[i];
            for (let j = 0; j < row.length; j++) {
                inventory.remove(row[j]?.evaluate(), 1);
            }
        }*/
    };

    /**
     * @example
     * ShapedCrafting.simple([
     *  "AAA",
     *  " A ",
     *  " A "
     * ], {"A": new ID(I.COBBLESTONE)}, new ID(I.STONE_PICKAXE))
     */
    static simple(crafting: string[], ids: Record<string, ID>, result: ID): ShapedCrafting {
        const items: (ID | null)[][] = [];

        for (let i = 0; i < crafting.length; i++) {
            const line = crafting[i];
            const itemsLine: (ID | null)[] = [];
            for (let j = 0; j < line.length; j++) {
                itemsLine.push(line[j] === " " ? null : ids[line[j]]);
            }
            items.push(itemsLine);
        }

        return new ShapedCrafting(items, result);
    };
}