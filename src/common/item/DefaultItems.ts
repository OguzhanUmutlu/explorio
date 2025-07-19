import {ItemIds} from "@/meta/ItemIds";
import {FlowerIds, ItemMetaDataConfig, S, ToolLevels, ToolType} from "@/meta/ItemInformation";
import LeavesBlock from "@/block/LeavesBlock";
import GrassBlock from "@/block/GrassBlock";
import {default as ID} from "@/item/ItemDescriptor";
import {default as IPool} from "@/item/ItemPool";

const I = {};

I[ItemIds.AIR] = {
    identifier: "air",
    name: "Air",
    texture: null,
    canBePhased: true,
    isOpaque: false,
    replaceableBy: "*",
    breakTime: -1
};
I[ItemIds.BEDROCK] = {
    identifier: "bedrock", step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
    drops: [], name: "Bedrock", breakTime: -1, explodeMaxDistance: -1
};
I[ItemIds.DIRT] = {
    identifier: "dirt", step: S.stepGrass, dig: S.stepGrass, break: S.digGrass, place: S.digGrass,
    name: "Dirt", breakTime: 0.75, breakTimes: {shovel: [0.4, 0.2, 0.15, 0.15, 0.1, 0.1, 0.1]}
};
I[ItemIds.CLAY] = {
    identifier: "clay", step: S.stepGrass, dig: S.stepGrass, break: S.digGrass, place: S.digGrass,
    name: "Clay", breakTime: 0.9, breakTimes: {shovel: [0.45, 0.25, 0.2, 0.15, 0.1, 0.15, 0.1]}
};

const grassOptions: Partial<ItemMetaDataConfig> = {
    breakTime: 0.9, step: S.stepGrass, dig: S.stepGrass, break: S.digGrass, place: S.digGrass,
    drops: [[new ID(ItemIds.DIRT)]], ticksRandomly: true,
    breakTimes: {shovel: [0.45, 0.25, 0.2, 0.15, 0.1, 0.15, 0.1]}
};
I[ItemIds.GRASS_BLOCK] = {
    ...grassOptions, identifier: "grass_block", name: "Grass Block", dataClass: GrassBlock
};
I[ItemIds.SNOWY_GRASS_BLOCK] = {
    ...grassOptions, identifier: "snowy_grass_block", name: "Snowy Grass Block", texture: "grass_block_snow"
};

I[ItemIds.GLASS] = {
    identifier: "glass", name: "Glass", breakTime: 0.5, step: S.stepStone, dig: S.stepStone, break: S.digGlass,
    place: S.digStone, drops: [], isOpaque: false
};

const stoneOpts: Partial<ItemMetaDataConfig> = {
    breakTime: 7.5, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
    dropsWithToolTypes: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN,
    breakTimes: {pickaxe: [1.15, 0.6, 0.45, 0.4, 0.2, 0.3, 0.25]}
};
I[ItemIds.STONE] = {
    ...stoneOpts, identifier: "stone", name: "Stone", drops: [[new ID(ItemIds.COBBLESTONE)]]
};

const cobbOpts: Partial<ItemMetaDataConfig> = {
    breakTime: 10, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
    dropsWithToolTypes: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN,
    breakTimes: {pickaxe: [1.5, 0.75, 0.6, 0.5, 0.25, 0.4, 0.35]}
};
I[ItemIds.COBBLESTONE] = {
    ...cobbOpts, identifier: "cobblestone", name: "Cobblestone", smeltsTo: new ID(ItemIds.STONE), smeltXP: 0.1
};

const logOptions: Partial<ItemMetaDataConfig> = {
    metas: [
        {identifier: "oak_log", name: "Oak Log"},
        {identifier: "dark_oak_log", name: "Dark Oak Log"},
        {identifier: "birch_log", name: "Birch Log"},
        {identifier: "jungle_log", name: "Jungle Log"},
        {identifier: "spruce_log", name: "Spruce Log"},
        {identifier: "acacia_log", name: "Acacia Log"},
        {identifier: "mangrove_log", name: "Mangrove Log"},
        {identifier: "pale_oak_log", name: "Pale Oak Log"},
        {identifier: "azalea_log", name: "Azalea Log", texture: "oak_log"},
        {identifier: "cherry_log", name: "Cherry Log"}
    ],
    breakTime: 3,
    step: S.stepWood,
    dig: S.stepWood,
    break: S.digWood,
    place: S.digWood,
    breakTimes: {axe: [1.5, 0.75, 0.6, 0.5, 0.25, 0.4, 0.35]},
    fuel: 3.5,
    smeltXP: 0.15,
    smeltsTo: new ID(ItemIds.CHARCOAL)
};

I[ItemIds.LOG] = logOptions;
I[ItemIds.NATURAL_LOG] = {
    ...logOptions,
    metas: logOptions.metas.map(i => ({...i, texture: i.identifier, identifier: i.identifier + "_natural"})),
    name: "Natural Log", canBePhased: true, isOpaque: false
};

I[ItemIds.LEAVES] = {
    metas: [
        {identifier: "oak_leaves", name: "Oak Leaves"},
        {identifier: "dark_oak_leaves", name: "Dark Oak Leaves"},
        {identifier: "birch_leaves", name: "Birch Leaves"},
        {identifier: "jungle_leaves", name: "Jungle Leaves"},
        {identifier: "spruce_leaves", name: "Spruce Leaves"},
        {identifier: "acacia_leaves", name: "Acacia Leaves"},
        {identifier: "mangrove_leaves", name: "Mangrove Leaves"},
        {identifier: "pale_oak_leaves", name: "Pale Oak Leaves"},
        {identifier: "azalea_leaves", name: "Azalea Leaves"},
        {identifier: "cherry_leaves", name: "Cherry Leaves"}
    ],
    breakTime: 0.2, step: S.stepGrass, dig: S.stepGrass, break: S.digGrass, place: S.digGrass,
    fuel: 0.2, drops: [[new ID(ItemIds.APPLE).setChance(0.05)]], fireResistance: 5, isOpaque: false,
    breakTimes: {hoe: [0.15, 0.1, 0.1, 0.05, 0.05, 0.05, 0.05]}, dataClass: LeavesBlock
};

I[ItemIds.GRAVEL] = {
    identifier: "gravel",
    step: S.stepGravel,
    dig: S.stepGravel,
    break: S.digGravel,
    place: S.digGravel,
    name: "Gravel",
    breakTime: 0.9,
    canFall: true,
    breakTimes: {shovel: [0.45, 0.25, 0.2, 0.15, 0.1, 0.15, 0.1]},
    drops: [[new IPool([new ID(ItemIds.GRAVEL), new ID(ItemIds.FLINT)], [90, 10])]]
};

I[ItemIds.WATER] = {
    identifier: "water", name: "Water", drops: [], explodeMaxDistance: -1, isLiquid: true, liquidSpread: 8,
    canBePhased: true, isOpaque: false, replaceableBy: "*"
};

I[ItemIds.LAVA] = {
    identifier: "lava", name: "Lava", drops: [], explodeMaxDistance: -1, isLiquid: true, liquidSpread: 4,
    canBePhased: true, isOpaque: false, replaceableBy: "*", liquidTicks: 12
};

const coalOre: Partial<ItemMetaDataConfig> = {
    step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
    breakTime: 15, drops: [[new ID(ItemIds.COAL)]], dropsWithToolTypes: ["pickaxe"],
    requiredToolLevel: ToolLevels.WOODEN, smeltsTo: new ID(ItemIds.COAL), xpDrops: [0, 2], smeltXP: 0.1,
    breakTimes: {pickaxe: [2.25, 1.15, 0.9, 0.75, 0.4, 0.6, 0.5]}
};
const copperOre: Partial<ItemMetaDataConfig> = {
    breakTime: 15, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone, smeltXP: 0.7,
    dropsWithToolTypes: ["pickaxe"], drops: [[new ID(ItemIds.RAW_COPPER)]], requiredToolLevel: ToolLevels.STONE,
    smeltsTo: new ID(ItemIds.COPPER_INGOT), breakTimes: {pickaxe: [7.5, 1.15, 0.9, 0.75, 1.25, 0.6, 0.5]}
};
const ironOre: Partial<ItemMetaDataConfig> = {
    breakTime: 15, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone, smeltXP: 0.7,
    dropsWithToolTypes: ["pickaxe"], drops: [[new ID(ItemIds.RAW_IRON)]], requiredToolLevel: ToolLevels.STONE,
    smeltsTo: new ID(ItemIds.IRON_INGOT), breakTimes: {pickaxe: [7.5, 1.15, 0.9, 0.75, 1.25, 0.6, 0.5]}
};
const goldOre: Partial<ItemMetaDataConfig> = {
    breakTime: 15, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone, smeltXP: 1,
    dropsWithToolTypes: ["pickaxe"], drops: [[new ID(ItemIds.RAW_GOLD)]], requiredToolLevel: ToolLevels.IRON,
    smeltsTo: new ID(ItemIds.GOLD_INGOT), breakTimes: {pickaxe: [7.5, 3.75, 3, 0.75, 1.25, 0.6, 0.5]}
};
const lapisOre: Partial<ItemMetaDataConfig> = {
    step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone, breakTime: 15,
    drops: [[new ID(ItemIds.LAPIS, 0, [1, 3])]], dropsWithToolTypes: ["pickaxe"],
    breakTimes: {pickaxe: [7.5, 1.15, 0.9, 0.75, 1.25, 0.6, 0.5]}, requiredToolLevel: ToolLevels.STONE,
    smeltsTo: new ID(ItemIds.LAPIS), smeltXP: 0.7, xpDrops: [0, 1]
};
const redstoneOre: Partial<ItemMetaDataConfig> = {
    breakTime: 15, drops: [[new ID(ItemIds.REDSTONE, 0, [1, 3])]], step: S.stepStone, dig: S.stepStone,
    break: S.digStone, place: S.digStone, dropsWithToolTypes: ["pickaxe"], smeltXP: 0.7, xpDrops: [0, 3],
    breakTimes: {pickaxe: [7.5, 3.75, 3, 0.75, 1.25, 0.6, 0.5]}, requiredToolLevel: ToolLevels.STONE,
    smeltsTo: new ID(ItemIds.REDSTONE)
};
const diamondOre: Partial<ItemMetaDataConfig> = {
    step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone, breakTime: 15,
    drops: [[new ID(ItemIds.DIAMOND)]], dropsWithToolTypes: ["pickaxe"], smeltXP: 1, xpDrops: [0, 3],
    breakTimes: {pickaxe: [7.5, 3.75, 3, 0.75, 1.25, 0.6, 0.5]}, requiredToolLevel: ToolLevels.IRON,
    smeltsTo: new ID(ItemIds.DIAMOND)
};

I[ItemIds.COAL_ORE] = {...coalOre, identifier: "coal_ore", name: "Coal Ore"};
I[ItemIds.COPPER_ORE] = {...copperOre, identifier: "copper_ore", name: "Copper Ore"};
I[ItemIds.IRON_ORE] = {...ironOre, identifier: "iron_ore", name: "Iron Ore"};
I[ItemIds.GOLD_ORE] = {...goldOre, identifier: "gold_ore", name: "Gold Ore"};
I[ItemIds.LAPIS_ORE] = {...lapisOre, identifier: "lapis_ore", name: "Lapis Ore"};
I[ItemIds.REDSTONE_ORE] = {...redstoneOre, identifier: "redstone_ore", name: "Redstone Ore"};
I[ItemIds.DIAMOND_ORE] = {...diamondOre, identifier: "diamond_ore", name: "Diamond Ore"};

I[ItemIds.DEEPSLATE] = {
    identifier: "deepslate", name: "Deepslate", breakTime: 15, drops: [[new ID(ItemIds.COBBLED_DEEPSLATE)]],
    step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone, dropsWithToolTypes: ["pickaxe"],
    breakTimes: {pickaxe: [2.25, 1.15, 0.9, 0.75, 0.4, 0.6, 0.5]}, requiredToolLevel: ToolLevels.WOODEN,
    smeltsTo: new ID(ItemIds.DEEPSLATE), smeltXP: 0.4
};
I[ItemIds.COBBLED_DEEPSLATE] = {
    identifier: "cobbled_deepslate", name: "Cobbled Deepslate", step: S.stepStone, dig: S.stepStone,
    break: S.digStone, place: S.digStone, drops: [[new ID(ItemIds.COBBLED_DEEPSLATE)]], breakTime: 17.5,
    dropsWithToolTypes: ["pickaxe"], breakTimes: {pickaxe: [2.65, 1.35, 1.05, 0.9, 0.45, 0.7, 0.6]},
    requiredToolLevel: ToolLevels.WOODEN
};

I[ItemIds.DEEPSLATE_COAL_ORE] = {
    ...coalOre, identifier: "deepslate_coal_ore", name: "Deepslate Coal Ore", breakTime: 22.5,
    breakTimes: {pickaxe: [3.4, 1.7, 1.35, 1.15, 0.6, 0.85, 0.75]}
};
I[ItemIds.DEEPSLATE_COPPER_ORE] = {
    ...copperOre, identifier: "deepslate_copper_ore", name: "Deepslate Copper Ore", breakTime: 22.5,
    breakTimes: {pickaxe: [11.25, 1.7, 1.35, 1.15, 1.9, 0.85, 0.75]}
};
I[ItemIds.DEEPSLATE_IRON_ORE] = {
    ...ironOre, identifier: "deepslate_iron_ore", name: "Deepslate Iron Ore", breakTime: 22.5,
    breakTimes: {pickaxe: [11.25, 1.7, 1.35, 1.15, 1.9, 0.85, 0.75]}
};
I[ItemIds.DEEPSLATE_GOLD_ORE] = {
    ...goldOre, identifier: "deepslate_gold_ore", name: "Deepslate Gold Ore", breakTime: 22.5,
    breakTimes: {pickaxe: [11.25, 5.65, 4.5, 1.15, 1.9, 0.85, 0.75]}
};
I[ItemIds.DEEPSLATE_LAPIS_ORE] = {
    ...lapisOre, identifier: "deepslate_lapis_ore", name: "Deepslate Lapis Ore", breakTime: 22.5,
    breakTimes: {pickaxe: [11.25, 1.7, 1.35, 1.15, 1.9, 0.85, 0.75]}
};
I[ItemIds.DEEPSLATE_REDSTONE_ORE] = {
    ...redstoneOre, identifier: "deepslate_redstone_ore", name: "Deepslate Redstone Ore", breakTime: 22.5,
    breakTimes: {pickaxe: [11.25, 5.65, 4.5, 1.15, 1.9, 0.85, 0.75]}
};
I[ItemIds.DEEPSLATE_DIAMOND_ORE] = {
    ...diamondOre, identifier: "deepslate_diamond_ore", name: "Deepslate Diamond Ore", breakTime: 22.5,
    breakTimes: {pickaxe: [11.25, 5.65, 4.5, 1.15, 1.9, 0.85, 0.75]}
};
I[ItemIds.DEEPSLATE_EMERALD_ORE] = {
    ...diamondOre, identifier: "deepslate_emerald_ore", name: "Deepslate Diamond Ore", breakTime: 22.5,
    breakTimes: {pickaxe: [11.25, 5.65, 4.5, 1.15, 1.9, 0.85, 0.75]}
};

const flowerOptions: Partial<ItemMetaDataConfig> = {
    isOpaque: false,
    canBePlacedOn: [ItemIds.GRASS_BLOCK, ItemIds.SNOWY_GRASS_BLOCK, ItemIds.DIRT],
    canBePhased: true,
    breakTime: 0,
    dig: S.stepGrass,
    break: S.digGrass,
    place: S.digGrass,
    step: S.stepGrass
};

FlowerIds.forEach(([identifier, name, id]) => I[id] = {...flowerOptions, identifier, name});

I[ItemIds.APPLE] = {
    identifier: "apple", name: "Apple", foodPoints: 4, isBlock: false
};

I[ItemIds.PLANKS] = {
    identifier: "planks", name: "Planks", isBlock: true, step: S.stepWood, dig: S.stepWood, break: S.digWood,
    place: S.digWood, breakTime: 3, breakTimes: {axe: [1.5, 0.75, 0.6, 0.5, 0.25, 0.4, 0.35]},
    makeSlabs: ItemIds.WOODEN_SLAB, fuel: 1, makeStairs: ItemIds.WOODEN_STAIRS, metas: [
        {identifier: "oak_planks", name: "Oak Planks"},
        {identifier: "dark_oak_planks", name: "Dark Oak Planks"},
        {identifier: "birch_planks", name: "Birch Planks"},
        {identifier: "jungle_planks", name: "Jungle Planks"},
        {identifier: "spruce_planks", name: "Spruce Planks"},
        {identifier: "acacia_planks", name: "Acacia Planks"},
        {identifier: "mangrove_planks", name: "Mangrove Planks"},
        {identifier: "pale_oak_planks", name: "Pale Oak Planks"},
        {identifier: "azalea_planks", name: "Azalea Planks"},
        {identifier: "cherry_planks", name: "Cherry Planks"}
    ]
};

I[ItemIds.COAL] = {
    identifier: "coal", name: "Coal", isBlock: false, fuel: 2
};

I[ItemIds.COPPER_INGOT] = {
    identifier: "copper_ingot", name: "Copper Ingot", isBlock: false
};

I[ItemIds.RAW_IRON] = {
    identifier: "raw_iron", name: "Raw Iron", isBlock: false, smeltsTo: new ID(ItemIds.IRON_INGOT), smeltXP: 0.2
};

I[ItemIds.RAW_GOLD] = {
    identifier: "raw_gold", name: "Raw Gold", isBlock: false, smeltsTo: new ID(ItemIds.GOLD_INGOT), smeltXP: 0.2
};

I[ItemIds.LAPIS] = {
    identifier: "lapis", name: "Lapis", texture: "lapis_lazuli", isBlock: false
};

I[ItemIds.REDSTONE] = {
    identifier: "redstone", name: "Redstone", isBlock: false
};

I[ItemIds.DIAMOND] = {
    identifier: "diamond", name: "Diamond", isBlock: false
};

I[ItemIds.CRAFTING_TABLE] = {
    identifier: "crafting_table", name: "Crafting Table", breakTime: 3.75, step: S.stepWood, dig: S.stepWood,
    break: S.digWood, place: S.digWood, breakTimes: {axe: [1.9, 0.95, 0.75, 0.65, 0.35, 0.5, 0.45]}, fuel: 1.25,
    smeltXP: 0.15, smeltsTo: new ID(ItemIds.CHARCOAL)
};

I[ItemIds.CHEST] = {
    identifier: "chest", name: "Chest", breakTime: 3.75, step: S.stepWood, dig: S.stepWood, break: S.digWood,
    place: S.digWood, breakTimes: {axe: [1.9, 0.95, 0.75, 0.65, 0.35, 0.5, 0.45]}, fuel: 1.25, smeltXP: 0.15,
    smeltsTo: new ID(ItemIds.CHARCOAL), isOpaque: false, metas: [
        {name: "Chest", identifier: "chest"},
        {name: "Chest", identifier: "chest_left"},
        {name: "Chest", identifier: "chest_right"}
    ]
};

I[ItemIds.FURNACE] = {
    identifier: "furnace",
    name: "Furnace",
    breakTime: 17.5,
    step: S.stepStone,
    dig: S.stepStone,
    break: S.digStone,
    place: S.digStone,
    dropsWithToolTypes: ["pickaxe"],
    requiredToolLevel: ToolLevels.WOODEN,
    breakTimes: {pickaxe: [2.65, 1.35, 1.05, 0.9, 0.45, 0.7, 0.6]}
};

I[ItemIds.SAND] = {
    identifier: "sand", name: "Sand", step: S.stepSand, dig: S.stepSand, break: S.digSand, place: S.digSand,
    breakTime: 0.75, canFall: true, breakTimes: {shovel: [0.4, 0.2, 0.15, 0.15, 0.1, 0.1, 0.1]}
};

I[ItemIds.STICK] = {
    identifier: "stick", name: "Stick", isBlock: false
};

I[ItemIds.FLINT] = {
    identifier: "flint", name: "Flint", isBlock: false
};

const registerToolType = (name: string, durability: number) => {
    const lName = name.toLowerCase(); // everything lower case like wooden
    const uName = name.toUpperCase(); // everything upper case like WOODEN
    const cName = name.charAt(0).toUpperCase() + name.slice(1); // capitalize first letter like Wooden

    const toolBase: Partial<ItemMetaDataConfig> = {
        isBlock: false,
        toolLevel: ToolLevels[uName],
        maxStack: 1,
        durability
    };

    for (const cNameT of ["Sword", "Axe", "Pickaxe", "Shovel", "Hoe"]) {
        I[ItemIds[uName + "_" + cNameT.toUpperCase()]] = {
            ...toolBase,
            identifier: `${lName}_${cNameT.toLowerCase()}`,
            name: `${cName} ${cNameT}`,
            toolType: <ToolType>cNameT.toLowerCase()
        };
    }
};

registerToolType("wooden", 61);
registerToolType("stone", 131);
registerToolType("copper", 190);
registerToolType("iron", 250);
registerToolType("golden", 32);
registerToolType("diamond", 1561);
registerToolType("netherite", 2031);

export default I;