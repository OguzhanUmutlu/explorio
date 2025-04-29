import ShapelessCrafting from "@/crafting/ShapelessCrafting";
import {default as ID} from "@/item/ItemDescriptor";
import {ItemIds} from "@/meta/ItemIds";
import Item from "@/item/Item";
import Inventory from "@/item/Inventory";
import {Crafting} from "@/crafting/Crafting";
import ShapedCrafting from "@/crafting/ShapedCrafting";
import {TreeType} from "@/meta/Items";

export const CraftingList: Crafting[] = [
    ShapedCrafting.simple([
        `A`,
        `A`
    ], {A: new ID(ItemIds.PLANKS)}, new ID(ItemIds.STICK, 0, 4)),
    ShapedCrafting.simple([
        `AAA`,
        `A A`,
        `AAA`
    ], {A: new ID(ItemIds.PLANKS)}, new ID(ItemIds.CHEST)),
    ShapedCrafting.simple([
        `AAA`,
        `A A`,
        `AAA`
    ], {A: new ID(ItemIds.COBBLESTONE)}, new ID(ItemIds.FURNACE)),
    ...tools(new ID(ItemIds.PLANKS), {
        sword: new ID(ItemIds.WOODEN_SWORD),
        axe: new ID(ItemIds.WOODEN_AXE),
        pickaxe: new ID(ItemIds.WOODEN_PICKAXE),
        shovel: new ID(ItemIds.WOODEN_SHOVEL),
        hoe: new ID(ItemIds.WOODEN_HOE)
    }),
    ...tools(new ID(ItemIds.COBBLESTONE), {
        sword: new ID(ItemIds.STONE_SWORD),
        axe: new ID(ItemIds.STONE_AXE),
        pickaxe: new ID(ItemIds.STONE_PICKAXE),
        shovel: new ID(ItemIds.STONE_SHOVEL),
        hoe: new ID(ItemIds.STONE_HOE)
    }),
    ...tools(new ID(ItemIds.IRON_INGOT), {
        sword: new ID(ItemIds.IRON_SWORD),
        axe: new ID(ItemIds.IRON_AXE),
        pickaxe: new ID(ItemIds.IRON_PICKAXE),
        shovel: new ID(ItemIds.IRON_SHOVEL),
        hoe: new ID(ItemIds.IRON_HOE)
    }),
    ...tools(new ID(ItemIds.GOLD_INGOT), {
        sword: new ID(ItemIds.GOLDEN_SWORD),
        axe: new ID(ItemIds.GOLDEN_AXE),
        pickaxe: new ID(ItemIds.GOLDEN_PICKAXE),
        shovel: new ID(ItemIds.GOLDEN_SHOVEL),
        hoe: new ID(ItemIds.GOLDEN_HOE)
    }),
    ...tools(new ID(ItemIds.DIAMOND), {
        sword: new ID(ItemIds.DIAMOND_SWORD),
        axe: new ID(ItemIds.DIAMOND_AXE),
        pickaxe: new ID(ItemIds.DIAMOND_PICKAXE),
        shovel: new ID(ItemIds.DIAMOND_SHOVEL),
        hoe: new ID(ItemIds.DIAMOND_HOE)
    })
];

for (let meta = 0; meta < TreeType.length; meta++) {
    CraftingList.push(
        new ShapelessCrafting([new ID(ItemIds.LOG, meta)], new ID(ItemIds.PLANKS, meta, 4)),
        ShapedCrafting.simple([
            `AA`,
            `AA`
        ], {A: new ID(ItemIds.PLANKS, meta)}, new ID(ItemIds.CRAFTING_TABLE))
    );
}

function sword(material: ID, result: ID) {
    return ShapedCrafting.simple([
        `A`,
        `A`,
        `B`
    ], {A: material, B: new ID(ItemIds.STICK)}, result);
}

function axes(material: ID, result: ID) {
    return [
        ShapedCrafting.simple([
            `AA`,
            `AB`,
            ` B`
        ], {A: material, B: new ID(ItemIds.STICK)}, result),
        ShapedCrafting.simple([
            `AA`,
            `BA`,
            `B `
        ], {A: material, B: new ID(ItemIds.STICK)}, result)
    ];
}

function pickaxe(material: ID, result: ID) {
    return ShapedCrafting.simple([
        `AAA`,
        ` B `,
        ` B `
    ], {A: material, B: new ID(ItemIds.STICK)}, result);
}

function shovel(material: ID, result: ID) {
    return ShapedCrafting.simple([
        `A`,
        `B`,
        `B`
    ], {A: material, B: new ID(ItemIds.STICK)}, result);
}

function hoes(material: ID, result: ID) {
    return [
        ShapedCrafting.simple([
            `AA`,
            `B `,
            `B `
        ], {A: material, B: new ID(ItemIds.STICK)}, result),
        ShapedCrafting.simple([
            `AA `,
            ` B `,
            ` B `
        ], {A: material, B: new ID(ItemIds.STICK)}, result)
    ];
}

function tools(material: ID, results: Record<"sword" | "axe" | "pickaxe" | "shovel" | "hoe", ID>) {
    return [
        sword(material, results.sword),
        ...axes(material, results.axe),
        pickaxe(material, results.pickaxe),
        shovel(material, results.shovel),
        ...hoes(material, results.hoe)
    ];
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