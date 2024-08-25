import {Texture} from "../client/js/Texture";
import {ItemDescriptor as ID, ItemPool as IPool} from "./Item";

export type Side = "bottom" | "top" | "left" | "right";
export type ToolType = "none" | "sword" | "axe" | "pickaxe" | "shovel" | "hoe" | "shears";
export type ToolLevel = typeof ToolLevels[keyof typeof ToolLevels];
export type ArmorType = "none" | "helmet" | "chestplate" | "leggings" | "boots";
export type ItemId = keyof typeof ItemIds;
export type ItemIdMap<T> = { [p: ItemId]: T };

export type ItemMetaData = {
    texture?: string | string[],
    isBlock?: boolean,
    replaceableBy?: ItemId[] | "*",
    isTransparent?: boolean,
    canBePlacedOn?: ItemId[] | "*",
    cannotBePlacedOn?: ItemId[],
    canBePhased?: boolean,
    drops?: (ID | IPool)[] | null, // null means it will drop the block as an item
    requiresSide?: Side[] | null, // If one of the given sides are empty, the block will drop itself as an item
    canFall?: boolean, // When enabled the block falls when there is nothing under it
    canHoldBlocks?: boolean, // This one is a bit unclear, when this is disabled, blocks can't be placed around this block.
    explodeMaxDistance?: number, // The maximum distance required to explode this block, default = 5, to disable set to -1
    hardness?: number, // How many seconds it takes to break the block
    requiredToolLevel?: ToolLevel,
    dropsWithToolTypes?: ToolType[] | "*",
    intendedToolType?: ToolType[] | "*", // This makes it faster to break as the used tool upgrades
    step?: keyof typeof STEP_SOUNDS | null, // null for no sound
    dig?: keyof typeof DIG_SOUNDS | null, // null for no sound
    solid?: boolean,
    fuel?: number, // How many items it can smelt
    smeltsTo?: ID | IPool | null, // null means it will just disappear after smelting, and possibly give XP from smeltXP property
    xpDrops?: number | number[],
    smeltXP?: number,
    makeSlabs?: ItemId | null,
    makeStairs?: ItemId | null,
    canReplaceAnyBlock?: boolean,
    fireResistance?: number, // how many seconds it takes to burn the block, -1 for not burnable
    isOpaque?: boolean,
    isSlab?: boolean,
    isStairs?: boolean,
    isConsumeable?: boolean,
    foodPoints?: number, // How much food points the item gives
    armorType?: ArmorType,
    armorPoints?: number, // For client side
    maxStack?: number,
    durability?: number, // -1 for infinite durability
};

export const ToolLevels = {
    NONE: 0,
    WOODEN: 1,
    STONE: 2,
    GOLD: 3,
    IRON: 4,
    DIAMOND: 5,
    NETHERITE: 6
} as const;

export enum ItemIds {
    AIR,
    BEDROCK,
    STONE,
    GRASS_BLOCK,
    SNOWY_GRASS_BLOCK,
    DIRT,
    GLASS,
    COBBLESTONE,
    LOG,
    LEAVES,
    NATURAL_LOG,
    GRAVEL,
    WATER,
    LAVA,
    COAL_ORE,
    IRON_ORE,
    GOLD_ORE,
    LAPIS_ORE,
    REDSTONE_ORE,
    DIAMOND_ORE,
    DEEPSLATE_COAL_ORE,
    DEEPSLATE_IRON_ORE,
    DEEPSLATE_GOLD_ORE,
    DEEPSLATE_LAPIS_ORE,
    DEEPSLATE_REDSTONE_ORE,
    DEEPSLATE_DIAMOND_ORE,
    DEEPSLATE,
    COBBLED_DEEPSLATE,
    ALLIUM,
    BLUE_ORCHID,
    DANDELION,
    HOUSTONIA,
    ORANGE_TULIP,
    OXEYE_DAISY,
    PAEONIA,
    PINK_TULIP,
    RED_TULIP,
    ROSE,
    WHITE_TULIP,
    SPONGE,
    WET_SPONGE,
    PLANKS,
    FURNACE,
    WOODEN_SLAB,
    STONE_SLAB,
    COBBLESTONE_SLAB,
    DIRT_SLAB,
    WOODEN_STAIRS,
    STONE_STAIRS,
    COBBLESTONE_STAIRS,
    DIRT_STAIRS,
    COAL_BLOCK,
    IRON_BLOCK,
    GOLD_BLOCK,
    DIAMOND_BLOCK,
    ANVIL,
    ENTITY_SPAWNER,

    CHARCOAL,
    APPLE,
    FLINT,
    RAW_IRON,
    RAW_GOLD,
    COAL,
    IRON_INGOT,
    GOLD_INGOT,
    LAPIS,
    REDSTONE,
    DIAMOND
}

export const STEP_SOUNDS = {
    cloth: ["cloth", 4],
    coral: ["coral", 6],
    grass: ["grass", 6],
    gravel: ["gravel", 4],
    ladder: ["ladder", 5],
    sand: ["sand", 5],
    scaffold: ["scaffold", 7],
    snow: ["snow", 4],
    stone: ["stone", 6],
    wet_grass: ["wet_grass", 6],
    wood: ["wood", 6]
};

export const DIG_SOUNDS = {
    cloth: ["cloth", 4],
    coral: ["coral", 4],
    glass: ["glass", 4],
    grass: ["grass", 4],
    gravel: ["gravel", 4],
    sand: ["sand", 4],
    snow: ["snow", 4],
    stone: ["stone", 4],
    wet_grass: ["wet_grass", 4],
    wood: ["wood", 4]
};

export const ItemTextures: ItemIdMap<Texture | Texture[]> = {};
export const ItemConsumeable: ItemIdMap<boolean> = {};
export const ItemFoodPoints: ItemIdMap<number> = {};
export const ItemArmorType: ItemIdMap<ArmorType> = {};
export const ItemArmorPoints: ItemIdMap<number> = {};
export const ItemDurability: ItemIdMap<number> = {};
export const ItemMaxStack: ItemIdMap<number> = {};
export const ItemFuel: ItemIdMap<number> = {};
export const ItemIsBlock: ItemIdMap<boolean> = {};
export const ItemSmeltsTo: ItemIdMap<string[]> = {};
export const ItemSmeltXP: ItemIdMap<number> = {};

export const BlockReplaceableBy: ItemIdMap<ItemId[] | "*"> = {};
export const BlockIsTransparent: ItemIdMap<boolean> = {};
export const BlockCanBePlacedOn: ItemIdMap<string[] | "*"> = {};
export const BlockCannotBePlacedOn: ItemIdMap<string[]> = {};
export const BlockCanBePhased: ItemIdMap<boolean> = {};
export const BlockDrops: ItemIdMap<ID[] | null> = {};
export const BlockRequiresSide: ItemIdMap<Side[] | null> = {};
export const BlockCanFall: ItemIdMap<boolean> = {};
export const BlockCanHoldBlocks: ItemIdMap<boolean> = {};
export const BlockExplodeMaxDistance: ItemIdMap<number> = {};
export const BlockHardness: ItemIdMap<number> = {};
export const BlockRequiredToolLevel: ItemIdMap<ToolLevel> = {};
export const BlockDropsWithToolTypes: ItemIdMap<ToolType[] | "*"> = {};
export const BlockStep: ItemIdMap<keyof typeof STEP_SOUNDS> = {};
export const BlockDig: ItemIdMap<keyof typeof DIG_SOUNDS> = {};
export const BlockSolid: ItemIdMap<boolean> = {};
export const BlockXpDrops: ItemIdMap<number | [number, number]> = {};
export const BlockCanReplaceAnyBlock: ItemIdMap<boolean> = {};
export const BlockFireResistance: ItemIdMap<number> = {};
export const BlockIsOpaque: ItemIdMap<boolean> = {};
export const BlockIsSlab: ItemIdMap<boolean> = {};
export const BlockIsStairs: ItemIdMap<boolean> = {};

export const DefaultItemOptions = id => <ItemMetaData>({
    texture: "./assets/textures/blocks/" + Object.keys(ItemIds).find(i => ItemIds[i] === id).toLowerCase() + ".png",
    isBlock: true,
    replaceableBy: [],
    isTransparent: false,
    canBePlacedOn: "*",
    cannotBePlacedOn: [],
    canBePhased: false,
    drops: null,
    requiresSide: null,
    canFall: false,
    canHoldBlocks: true,
    explodeMaxDistance: 5,
    hardness: 0,
    requiredToolLevel: ToolLevels.NONE,
    dropsWithToolTypes: "*",
    intendedToolType: "*",
    step: null,
    dig: null,
    solid: true,
    fuel: 0,
    smeltsTo: null,
    xpDrops: 0,
    smeltXP: 0,
    makeSlabs: null,
    makeStairs: null,
    canReplaceAnyBlock: true,
    fireResistance: -1,
    isOpaque: true,
    isSlab: false,
    isStairs: false,
    isConsumeable: false,
    foodPoints: 0,
    armorType: null,
    armorPoints: 0,
    maxStack: 64,
    durability: -1
});

export function registerItem(id: number, O: ItemMetaData) {
    O = {...DefaultItemOptions(id), ...O};
    if (O.texture) {
        if (typeof O.texture === "string") {
            ItemTextures[id] = Texture.get(O.texture);
        } else {
            ItemTextures[id] = O.texture.map(t => Texture.get(t));
        }
    }
    ItemIsBlock[id] = O.isBlock;
    ItemFuel[id] = O.fuel;
    ItemSmeltsTo[id] = O.smeltsTo;
    ItemSmeltXP[id] = O.smeltXP;
    ItemConsumeable[id] = O.isConsumeable;
    ItemFoodPoints[id] = O.foodPoints;
    ItemArmorType[id] = O.armorType;
    ItemArmorPoints[id] = O.armorPoints;
    ItemMaxStack[id] = O.maxStack;
    ItemDurability[id] = O.durability;

    BlockReplaceableBy[id] = O.replaceableBy;
    BlockCanBePlacedOn[id] = O.canBePlacedOn;
    BlockCannotBePlacedOn[id] = O.cannotBePlacedOn;
    BlockCanBePhased[id] = O.canBePhased;
    BlockCanHoldBlocks[id] = O.canHoldBlocks;
    BlockCanFall[id] = O.canFall;
    BlockExplodeMaxDistance[id] = O.explodeMaxDistance;
    BlockHardness[id] = O.hardness;
    BlockRequiredToolLevel[id] = O.requiredToolLevel;
    BlockDropsWithToolTypes[id] = O.dropsWithToolTypes;
    BlockDrops[id] = O.drops;
    BlockRequiresSide[id] = O.requiresSide;
    BlockIsTransparent[id] = O.isTransparent;
    BlockSolid[id] = O.solid;
    BlockCanReplaceAnyBlock[id] = O.canReplaceAnyBlock;
    BlockFireResistance[id] = O.fireResistance;
    BlockIsOpaque[id] = O.isOpaque;
    BlockStep[id] = O.step;
    BlockDig[id] = O.dig;
    BlockXpDrops[id] = O.xpDrops;
    BlockIsSlab[id] = O.isSlab;
    BlockIsStairs[id] = O.isStairs;

    if (O.makeSlabs !== null) {
        const sId = ItemIds[O.makeSlabs];
        registerItem(sId, {...O, isSlab: true, texture: null});
        const textureN = ItemTextures[sId];
        const texture: Texture[] = Array.isArray(textureN) ? textureN : [textureN];
        const sTexture = ItemTextures[sId] = [];
        sTexture.push(
            ...texture.map(t => t.slabTop()),
            ...texture.map(t => t.slabBottom())
        );
    }
    if (O.makeStairs !== null) {
        const sId = ItemIds[O.makeStairs];
        registerItem(sId, {...O, isStairs: true, texture: null});
        const textureN = ItemTextures[sId];
        const texture: Texture[] = Array.isArray(textureN) ? textureN : [textureN];
        const sTexture = ItemTextures[sId] = [];
        sTexture.push(
            ...texture.map(t => t.stairsTopLeft()),
            ...texture.map(t => t.stairsTopRight()),
            ...texture.map(t => t.stairsBottomLeft()),
            ...texture.map(t => t.stairsBottomRight())
        );
    }
}

export const FlowerIds = [
    ItemIds.ALLIUM, ItemIds.BLUE_ORCHID, ItemIds.DANDELION, ItemIds.HOUSTONIA, ItemIds.ORANGE_TULIP, ItemIds.OXEYE_DAISY,
    ItemIds.PAEONIA, ItemIds.PINK_TULIP, ItemIds.RED_TULIP, ItemIds.ROSE, ItemIds.WHITE_TULIP
] as const;

export function initItems() {
    registerItem(ItemIds.AIR, {
        texture: null, canBePhased: true, isOpaque: false
    });
    registerItem(ItemIds.BEDROCK, {
        hardness: -1, step: "stone", dig: "stone", drops: [], explodeMaxDistance: -1
    });
    registerItem(ItemIds.DIRT, {
        hardness: 0.5, step: "grass", dig: "grass", intendedToolType: ["shovel"]
    });

    const grassOptions: ItemMetaData = {
        hardness: 0.6, step: "grass", dig: "grass", drops: [new ID(ItemIds.DIRT)], intendedToolType: ["shovel"]
    };
    registerItem(ItemIds.GRASS_BLOCK, grassOptions);
    registerItem(ItemIds.SNOWY_GRASS_BLOCK, grassOptions);

    registerItem(ItemIds.GLASS, {
        hardness: 0.5, step: "stone", dig: "glass", intendedToolType: ["pickaxe"], drops: [], isOpaque: false
    });

    const stoneOpts: ItemMetaData = {
        hardness: 3, step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"],
        requiredToolLevel: ToolLevels.WOODEN, intendedToolType: ["pickaxe"]
    };
    registerItem(ItemIds.STONE, {...stoneOpts, drops: [new ID(ItemIds.COBBLESTONE)]});

    const cobbOpts: ItemMetaData = {
        hardness: 3.3, step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"],
        requiredToolLevel: ToolLevels.WOODEN, intendedToolType: ["pickaxe"]
    };
    registerItem(ItemIds.COBBLESTONE, {...cobbOpts, smeltsTo: new ID(ItemIds.STONE), smeltXP: 0.1});

    const logOptions: ItemMetaData = {
        texture: [
            "assets/textures/blocks/log_oak.png",
            "assets/textures/blocks/log_big_oak.png",
            "assets/textures/blocks/log_birch.png",
            "assets/textures/blocks/log_jungle.png",
            "assets/textures/blocks/log_spruce.png",
            "assets/textures/blocks/log_acacia.png"
        ],
        hardness: 2, step: "wood", dig: "wood", dropsWithToolTypes: ["axe"], intendedToolType: ["axe"],
        fuel: 1.5, smeltXP: 0.15, smeltsTo: new ID(ItemIds.CHARCOAL)
    };

    const leavesOptions: ItemMetaData = {
        texture: [
            "assets/textures/blocks/leaves_oak.png",
            "assets/textures/blocks/leaves_big_oak.png",
            "assets/textures/blocks/leaves_birch.png",
            "assets/textures/blocks/leaves_jungle.png",
            "assets/textures/blocks/leaves_spruce.png",
            "assets/textures/blocks/leaves_acacia.png"
        ],
        hardness: 0.2, step: "grass", dig: "grass", dropsWithToolTypes: ["hoe"], intendedToolType: ["hoe"],
        fuel: 0.2, drops: [new ID(ItemIds.APPLE).setChance(0.05)], fireResistance: 5, isOpaque: false
    };

    registerItem(ItemIds.LOG, logOptions);
    registerItem(ItemIds.LEAVES, leavesOptions);
    registerItem(ItemIds.NATURAL_LOG, {...logOptions, canBePhased: true, isOpaque: false});

    registerItem(ItemIds.GRAVEL, {
        hardness: 0.6, canFall: true, step: "gravel", dig: "gravel", intendedToolType: ["shovel"],
        drops: [new IPool([new ID(ItemIds.GRAVEL), new ID(ItemIds.FLINT)], [90, 10])]
    });
    registerItem(ItemIds.WATER, {
        drops: [], explodeMaxDistance: -1, solid: false, canBePhased: true, isOpaque: false,
        texture: [
            "assets/textures/blocks/water_8.png",
            "assets/textures/blocks/water_7.png",
            "assets/textures/blocks/water_6.png",
            "assets/textures/blocks/water_5.png",
            "assets/textures/blocks/water_4.png",
            "assets/textures/blocks/water_3.png",
            "assets/textures/blocks/water_2.png",
            "assets/textures/blocks/water_1.png"
        ]
    });
    registerItem(ItemIds.LAVA, {
        drops: [], explodeMaxDistance: -1, solid: false, canBePhased: true,
        texture: [
            "assets/textures/blocks/lava_8.png",
            "assets/textures/blocks/lava_7.png",
            "assets/textures/blocks/lava_6.png",
            "assets/textures/blocks/lava_5.png",
            "assets/textures/blocks/lava_4.png",
            "assets/textures/blocks/lava_3.png",
            "assets/textures/blocks/lava_2.png",
            "assets/textures/blocks/lava_1.png"
        ]
    });

    const coalOre: ItemMetaData = {
        hardness: 3, drops: [new ID(ItemIds.COAL)], step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"],
        intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN, smeltsTo: new ID(ItemIds.COAL),
        xpDrops: [0, 2], smeltXP: 0.1
    };
    const ironOre: ItemMetaData = {
        hardness: 3, step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"], drops: [new ID(ItemIds.RAW_IRON)],
        intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.STONE, smeltsTo: new ID(ItemIds.IRON_INGOT),
        smeltXP: 0.7
    };
    const goldOre: ItemMetaData = {
        hardness: 5, step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"], drops: [new ID(ItemIds.RAW_GOLD)],
        intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.IRON, smeltsTo: new ID(ItemIds.GOLD_INGOT),
        smeltXP: 1
    };
    const lapisOre: ItemMetaData = {
        hardness: 3, drops: [new ID(ItemIds.LAPIS)], step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"],
        intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.STONE, smeltsTo: new ID(ItemIds.LAPIS),
        smeltXP: 0.7, xpDrops: [0, 1]
    };
    const redstoneOre: ItemMetaData = {
        hardness: 3, drops: [new ID(ItemIds.REDSTONE, 0, [1, 3])], step: "stone", dig: "stone",
        dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.STONE,
        smeltsTo: new ID(ItemIds.REDSTONE), smeltXP: 0.7, xpDrops: [0, 3]
    };
    const diamondOre: ItemMetaData = {
        hardness: 5, drops: [new ID(ItemIds.DIAMOND)], step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"],
        intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.IRON, smeltsTo: new ID(ItemIds.DIAMOND),
        smeltXP: 1, xpDrops: [0, 3]
    };

    registerItem(ItemIds.COAL_ORE, coalOre);
    registerItem(ItemIds.IRON_ORE, ironOre);
    registerItem(ItemIds.GOLD_ORE, goldOre);
    registerItem(ItemIds.LAPIS_ORE, lapisOre);
    registerItem(ItemIds.REDSTONE_ORE, redstoneOre);
    registerItem(ItemIds.DIAMOND_ORE, diamondOre);

    registerItem(ItemIds.DEEPSLATE, {
        hardness: 4, drops: [new ID(ItemIds.COBBLED_DEEPSLATE)], step: "stone", dig: "stone",
        dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN,
        smeltsTo: new ID(ItemIds.DEEPSLATE), smeltXP: 0.4
    });
    registerItem(ItemIds.COBBLED_DEEPSLATE, {
        hardness: 5, drops: [new ID(ItemIds.COBBLED_DEEPSLATE)], step: "stone", dig: "stone",
        dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN
    });

    registerItem(ItemIds.DEEPSLATE_COAL_ORE, {...coalOre, hardness: 5});
    registerItem(ItemIds.DEEPSLATE_IRON_ORE, {...ironOre, hardness: 5});
    registerItem(ItemIds.DEEPSLATE_GOLD_ORE, {...goldOre, hardness: 8});
    registerItem(ItemIds.DEEPSLATE_LAPIS_ORE, {...lapisOre, hardness: 5});
    registerItem(ItemIds.DEEPSLATE_REDSTONE_ORE, {...redstoneOre, hardness: 5});
    registerItem(ItemIds.DEEPSLATE_DIAMOND_ORE, {...diamondOre, hardness: 8});

    const flowerOptions: ItemMetaData = {
        isOpaque: false, canBePlacedOn: ["GRASS_BLOCK", "SNOWY_GRASS_BLOCK", "DIRT"], canBePhased: true,
        hardness: 0, dig: "grass", step: "grass"
    };

    FlowerIds.forEach(id => registerItem(id, flowerOptions));
}
