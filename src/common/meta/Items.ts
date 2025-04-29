import Texture, {Canvas, createCanvas} from "@/utils/Texture";
import {default as ID} from "@/item/ItemDescriptor";
import {default as IPool} from "@/item/ItemPool";
import {
    FullId2Data,
    FullIds,
    Id2Data,
    ItemIdentifiers,
    ItemIds,
    ItemMetaBits,
    ItemMetaMax,
    ItemMetaMaxN,
    Items
} from "@/meta/ItemIds";
import {ClassOf} from "@/utils/Utils";
import BlockData from "@/item/BlockData";
import GrassBlock from "@/block/GrassBlock";
import LeavesBlock from "@/block/LeavesBlock";

export enum TreeType {
    Oak,
    DarkOak,
    Birch,
    Jungle,
    Spruce,
    Acacia,
    Mangrove,
    PaleOak,
    Azalea,
    Cherry,
    length // length constant
}

export type Side = "bottom" | "top" | "left" | "right";
export type ToolType = "none" | "sword" | "axe" | "pickaxe" | "shovel" | "hoe" | "shears";
export type ToolLevel = typeof ToolLevels[keyof typeof ToolLevels];
export type ArmorType = -1 | 0 | 1 | 2 | 3; // -1=none, 0=helmet, 1=chestplate, 2=leggings, 3=boots

export interface ItemMetaDataConfig {
    identifier?: string,
    name?: string,
    texture?: string | Texture | Canvas | (() => Texture),
    metas: {
        identifier: string,
        name: string,
        texture?: string | Texture | Canvas | (() => Texture),
        blockTexture?: string | Texture | Canvas | (() => Texture),
        __processed__?: { texture: Texture, blockTexture: Texture },
        __processed_biomes__?: { texture: Texture[], blockTexture: Texture[] }
    }[],
    fuel: number, // How many items it can smelt
    smeltsTo: ID | IPool | null, // null means it will just disappear after smelting, and possibly give XP from smeltXP property
    xpDrops: number[],
    smeltXP: number,
    foodPoints: number, // How much food points the item gives
    armorType: ArmorType,
    armorPoints: number, // For client side
    maxStack: number,
    durability: number, // -1 for infinite durability,
    toolType: ToolType,
    toolLevel: ToolLevel,

    isBlock: boolean,
    replaceableBy: number[] | "*",
    canBePlacedOn: number[] | "*",
    cannotBePlacedOn: number[],
    canBePhased: boolean,
    drops: (ID | IPool)[][] | null, // null means it will drop the block as an item
    requiresSide: Side[] | null, // If one of the given sides are empty, the block will drop itself as an item
    canFall: boolean, // When enabled the block falls when there is nothing under it
    canHoldBlocks: boolean, // This one is a bit unclear, when this is disabled, blocks can't be placed around this block.
    explodeMaxDistance: number, // The maximum distance required to explode this block, default = 5, to disable set to -1
    breakTime: number, // How many seconds it takes to break the block
    requiredToolLevel: ToolLevel,
    dropsWithToolTypes: ToolType[] | "*",
    intendedToolType: ToolType[], // This makes it faster to break as the used tool upgrades
    step: typeof S[keyof typeof S] | null, // null for no sound
    dig: typeof S[keyof typeof S] | null, // null for no sound
    break: typeof S[keyof typeof S] | null, // null for no sound
    place: typeof S[keyof typeof S] | null, // null for no sound
    isLiquid: boolean,
    liquidTicks: number,
    liquidSpread: number,
    makeSlabs: number | null,
    makeStairs: number | null,
    fireResistance: number, // how many seconds it takes to burn the block, -1 for not burnable
    isOpaque: boolean,
    isSlab: boolean,
    isStairs: boolean,
    ticksRandomly: boolean
}


/**
 * @description Returns the id of a full id
 * @example f2meta(im2f(I.LOG, 5)) // I.LOG
 */
export function f2id(x: number) {
    return x >> ItemMetaBits;
}

/**
 * @description Returns the meta of a full id
 * @example f2meta(im2f(I.LOG, 5)) // 5
 */
export function f2meta(x: number) {
    return x & ItemMetaMaxN;
}

/**
 * @description Converts an item id and meta to a single number also called as the full id
 * @example im2f(I.LOG, 5)
 */
export function im2f(id: number, meta: number = 0) {
    const m = Id2Data[id];
    const maxMeta = m ? m.metas.length : ItemMetaMax;
    return (id << ItemMetaBits) | (meta % maxMeta);
}

export const ToolLevels = {
    NONE: 0,
    WOODEN: 1,
    STONE: 2,
    GOLDEN: 3,
    IRON: 4,
    DIAMOND: 5,
    NETHERITE: 6
} as const;

export const S = {
    "digCloth": ["dig/cloth$.ogg", 4],
    "digCoral": ["dig/coral$.ogg", 4],
    "digGlass": ["dig/glass$.ogg", 3],
    "digGrass": ["dig/grass$.ogg", 4],
    "digGravel": ["dig/gravel$.ogg", 4],
    "digSand": ["dig/sand$.ogg", 4],
    "digSnow": ["dig/snow$.ogg", 4],
    "digStone": ["dig/stone$.ogg", 4],
    "digWetGrass": ["dig/wet_grass$.ogg", 4],
    "digWood": ["dig/wood$.ogg", 4],
    "stepCloth": ["step/cloth$.ogg", 4],
    "stepCoral": ["step/coral$.ogg", 4],
    "stepGrass": ["step/grass$.ogg", 4],
    "stepGravel": ["step/gravel$.ogg", 4],
    "stepLadder": ["step/ladder$.ogg", 5],
    "stepSand": ["step/sand$.ogg", 4],
    "stepScaffold": ["step/scaffold$.ogg", 7],
    "stepSnow": ["step/snow$.ogg", 4],
    "stepStone": ["step/stone$.ogg", 4],
    "stepWetGrass": ["step/wet_grass$.ogg", 4],
    "stepWood": ["step/wood$.ogg", 4]
} as const;

export const DefaultItemOptions = (O: Partial<ItemMetaDataConfig>) => {
    const ret: ItemMetaDataConfig = {
        metas: [{
            identifier: O.identifier,
            name: O.name,
            texture: O.texture || O.identifier
        }],
        fuel: 0,
        smeltsTo: null,
        xpDrops: [0, 0],
        smeltXP: 0,
        foodPoints: 0,
        armorType: -1,
        armorPoints: 0,
        maxStack: 64,
        durability: -1,
        toolType: "none",
        toolLevel: 0,

        isBlock: true,
        replaceableBy: [],
        canBePlacedOn: "*",
        cannotBePlacedOn: [],
        canBePhased: false,
        drops: null,
        requiresSide: null,
        canFall: false,
        canHoldBlocks: true,
        explodeMaxDistance: 5,
        breakTime: 0,
        requiredToolLevel: ToolLevels.NONE,
        dropsWithToolTypes: "*",
        intendedToolType: [],
        step: null,
        dig: null,
        break: null,
        place: null,
        isLiquid: false,
        liquidSpread: 3,
        liquidTicks: 3,
        ticksRandomly: false,
        fireResistance: -1,
        makeSlabs: null,
        makeStairs: null,
        isOpaque: true,
        isSlab: false,
        isStairs: false
    };

    return ret;
}

export function introduceItemId(id: number, key: string, isBlock: boolean) {
    if (ItemIds[key]) throw new Error("Item already introduced: " + key);
    ItemIds[key] = id;
    if (isBlock) FullIds[key] ??= im2f(id);
}

export function registerItem(id: number, _O: Partial<ItemMetaDataConfig>, DataClass: ClassOf<BlockData> = BlockData) {
    if (!_O.metas && (!_O.identifier || !_O.name)) {
        throw new Error("Must define identifier and name if 'metas' keys is not given. ID: " + id);
    }

    const O = <ItemMetaDataConfig>{...DefaultItemOptions(_O), ..._O};
    delete O.identifier;
    delete O.name;
    delete O.texture;

    const key = Object.keys(ItemIds).find(i => ItemIds[i] === id);
    if (!key) throw new Error("First define item id: " + id + ", using introduceItemId(id, key, isBlock)");

    if (!O.drops) {
        O.drops = [];
        for (let meta = 0; meta < O.metas.length; meta++) {
            const nonRotated = O.isSlab || O.isStairs ? meta % (O.metas.length / 4) : meta;
            O.drops.push([new ID(id, nonRotated)]);
        }
    }

    O.metas[0].texture ??= O.metas[0].identifier;

    const identifier = O.metas[0].identifier;
    const baseMeta = Id2Data[id]
        = Items[identifier.toUpperCase()]
        = FullId2Data[im2f(id)]
        = ItemIdentifiers[identifier] = new DataClass(id, 0, O);

    if (O.isLiquid) for (let i = 0; i <= O.liquidSpread; i++) O.metas.push({
        identifier: identifier + "_flowing_state_" + i,
        name: "",
        texture: () => new Texture("", new Promise(r => {
            const texture = baseMeta.getTexture(null, 0);
            texture.wait().then(() => {
                const realHeight = texture.image.height;
                const width = texture.image.width;
                const height = realHeight * i / O.liquidSpread;

                const canvas = createCanvas(width, realHeight);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(texture.image, 0, 0);
                ctx.clearRect(0, 0, width, height);

                r(canvas);
            });
        }))
    });

    for (let meta = 1; meta < O.metas.length; meta++) {
        O.metas[meta].texture ??= O.metas[meta].identifier;

        const metadata = new DataClass(id, meta, O);
        const mMetaBuild = O.metas[meta];
        const identifier = mMetaBuild.identifier;

        Items[identifier] = FullId2Data[im2f(id, meta)] = ItemIdentifiers[mMetaBuild.identifier] = metadata;
    }

    function slabStairsProtocol(adder: string, oProp: string, oIsProp: string, nameAdder: string, fnMatch: string[][]) {
        if (!O[oProp]) return;

        const metas = Array(O.metas.length * fnMatch.length).fill({}).map((_, i) => {
            const dat = O.metas[i % O.metas.length];

            const iMod = Math.floor(i / O.metas.length);
            return {
                identifier: dat.identifier + adder + (iMod === 0 ? "" : "_" + iMod),
                name: dat.name + " " + nameAdder,
                texture: () => new Texture("", new Promise(r => {
                    const texture = baseMeta.getTexture(null, 0);
                    texture.wait().then(() => r(texture[fnMatch[iMod % fnMatch.length][1]]()));
                }))
            };
        });

        registerItem(O[oProp], {
            ...O, makeSlabs: null, makeStairs: null, [oIsProp]: true, metas, isOpaque: false
        });
    }

    slabStairsProtocol("_slab", "makeSlabs", "isSlab", "Slab", [
        ["_slab_bottom", "slabBottom"],
        ["_slab_left", "slabLeft"],
        ["_slab_top", "slabTop"],
        ["_slab_right", "slabRight"]
    ]);

    slabStairsProtocol("_stairs", "makeStairs", "isStairs", "Stairs", [
        ["_stairs_top_left", "stairsTopLeft"],
        ["_stairs_top_right", "stairsTopRight"],
        ["_stairs_bottom_left", "stairsBottomRight"],
        ["_stairs_bottom_right", "stairsBottomLeft"]
    ]);

    return Id2Data[id];
}

export const FlowerIds = [
    ["allium", "Allium", ItemIds.ALLIUM],
    ["blue_orchid", "Blue Orchid", ItemIds.BLUE_ORCHID],
    ["dandelion", "Dandelion", ItemIds.DANDELION],
    ["houstonia", "Houstonia", ItemIds.HOUSTONIA],
    ["orange_tulip", "Orange Tulip", ItemIds.ORANGE_TULIP],
    ["oxeye_daisy", "Oxeye Daisy", ItemIds.OXEYE_DAISY],
    ["paeonia", "Paeonia", ItemIds.PAEONIA],
    ["pink_tulip", "Pink Tulip", ItemIds.PINK_TULIP],
    ["red_tulip", "Red Tulip", ItemIds.RED_TULIP],
    ["rose", "Rose", ItemIds.ROSE],
    ["white_tulip", "White Tulip", ItemIds.WHITE_TULIP]
] as const;

export function initItems() {
    registerItem(ItemIds.AIR, {
        identifier: "air",
        name: "Air",
        texture: null,
        canBePhased: true,
        isOpaque: false,
        replaceableBy: "*",
        breakTime: -1
    });
    registerItem(ItemIds.BEDROCK, {
        identifier: "bedrock", step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        drops: [], name: "Bedrock", breakTime: -1, explodeMaxDistance: -1
    });
    registerItem(ItemIds.DIRT, {
        identifier: "dirt", step: S.stepGrass, dig: S.stepGrass, break: S.digGrass, place: S.digGrass,
        name: "Dirt", breakTime: 0.75,
        intendedToolType: ["shovel"]
    });

    const grassOptions: Partial<ItemMetaDataConfig> = {
        breakTime: 0.75, step: S.stepGrass, dig: S.stepGrass, break: S.digGrass, place: S.digGrass,
        drops: [[new ID(ItemIds.DIRT)]], intendedToolType: ["shovel"], ticksRandomly: true
    };
    registerItem(ItemIds.GRASS_BLOCK, {
        ...grassOptions, identifier: "grass_block", name: "Grass Block"
    }, GrassBlock);
    registerItem(ItemIds.SNOWY_GRASS_BLOCK, {
        ...grassOptions, identifier: "snowy_grass_block", name: "Snowy Grass Block", texture: "grass_block_snow"
    });

    registerItem(ItemIds.GLASS, {
        identifier: "glass", name: "Glass", breakTime: 0.5, step: S.stepStone, dig: S.stepStone, break: S.digGlass,
        place: S.digStone, intendedToolType: ["pickaxe"], drops: [], isOpaque: false
    });

    const stoneOpts: Partial<ItemMetaDataConfig> = {
        breakTime: 7.5, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        dropsWithToolTypes: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN, intendedToolType: ["pickaxe"]
    };
    registerItem(ItemIds.STONE, {
        ...stoneOpts, identifier: "stone", name: "Stone", drops: [[new ID(ItemIds.COBBLESTONE)]]
    });

    const cobbOpts: Partial<ItemMetaDataConfig> = {
        breakTime: 3.3, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        dropsWithToolTypes: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN, intendedToolType: ["pickaxe"]
    };
    registerItem(ItemIds.COBBLESTONE, {
        ...cobbOpts, identifier: "cobblestone", name: "Cobblestone", smeltsTo: new ID(ItemIds.STONE), smeltXP: 0.1
    });

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
        intendedToolType: ["axe"],
        fuel: 3.5,
        smeltXP: 0.15,
        smeltsTo: new ID(ItemIds.CHARCOAL)
    };

    registerItem(ItemIds.LOG, logOptions);
    registerItem(ItemIds.NATURAL_LOG, {
        ...logOptions,
        metas: logOptions.metas.map(i => ({...i, identifier: i.identifier + "_natural"})),
        name: "Natural Log", canBePhased: true, isOpaque: false
    });

    registerItem(ItemIds.LEAVES, {
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
        intendedToolType: ["hoe"], fuel: 0.2, drops: [[new ID(ItemIds.APPLE).setChance(0.05)]],
        fireResistance: 5, isOpaque: false
    }, LeavesBlock);

    registerItem(ItemIds.GRAVEL, {
        identifier: "gravel", step: S.stepGravel, dig: S.stepGravel, break: S.digGravel, place: S.digGravel,
        name: "Gravel", breakTime: 0.6, canFall: true, intendedToolType: ["shovel"],
        drops: [[new IPool([new ID(ItemIds.GRAVEL), new ID(ItemIds.FLINT)], [90, 10])]]
    });

    registerItem(ItemIds.WATER, {
        identifier: "water", name: "Water", drops: [], explodeMaxDistance: -1, isLiquid: true, liquidSpread: 8,
        canBePhased: true, isOpaque: false, replaceableBy: "*"
    });

    registerItem(ItemIds.LAVA, {
        identifier: "lava", name: "Lava", drops: [], explodeMaxDistance: -1, isLiquid: true, liquidSpread: 4,
        canBePhased: true, isOpaque: false, replaceableBy: "*", liquidTicks: 12
    });

    const coalOre: Partial<ItemMetaDataConfig> = {
        step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        breakTime: 15, drops: [[new ID(ItemIds.COAL)]], dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.WOODEN, smeltsTo: new ID(ItemIds.COAL), xpDrops: [0, 2], smeltXP: 0.1
    };
    const ironOre: Partial<ItemMetaDataConfig> = {
        breakTime: 15, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        dropsWithToolTypes: ["pickaxe"], drops: [[new ID(ItemIds.RAW_IRON)]], intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.STONE, smeltsTo: new ID(ItemIds.IRON_INGOT), smeltXP: 0.7
    };
    const goldOre: Partial<ItemMetaDataConfig> = {
        breakTime: 15, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        dropsWithToolTypes: ["pickaxe"], drops: [[new ID(ItemIds.RAW_GOLD)]], intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.IRON, smeltsTo: new ID(ItemIds.GOLD_INGOT), smeltXP: 1
    };
    const lapisOre: Partial<ItemMetaDataConfig> = {
        step: S.stepStone,
        dig: S.stepStone,
        break: S.digStone,
        place: S.digStone,
        breakTime: 15,
        drops: [[new ID(ItemIds.LAPIS, 0, [1, 3])]],
        dropsWithToolTypes: ["pickaxe"],
        intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.STONE,
        smeltsTo: new ID(ItemIds.LAPIS),
        smeltXP: 0.7,
        xpDrops: [0, 1]
    };
    const redstoneOre: Partial<ItemMetaDataConfig> = {
        breakTime: 15,
        drops: [[new ID(ItemIds.REDSTONE, 0, [1, 3])]],
        step: S.stepStone,
        dig: S.stepStone,
        break: S.digStone,
        place: S.digStone,
        dropsWithToolTypes: ["pickaxe"],
        intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.STONE,
        smeltsTo: new ID(ItemIds.REDSTONE),
        smeltXP: 0.7,
        xpDrops: [0, 3]
    };
    const diamondOre: Partial<ItemMetaDataConfig> = {
        step: S.stepStone,
        dig: S.stepStone,
        break: S.digStone,
        place: S.digStone,
        breakTime: 15,
        drops: [[new ID(ItemIds.DIAMOND)]],
        dropsWithToolTypes: ["pickaxe"],
        intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.IRON,
        smeltsTo: new ID(ItemIds.DIAMOND),
        smeltXP: 1,
        xpDrops: [0, 3]
    };

    registerItem(ItemIds.COAL_ORE, {...coalOre, identifier: "coal_ore", name: "Coal Ore"});
    registerItem(ItemIds.IRON_ORE, {...ironOre, identifier: "iron_ore", name: "Iron Ore"});
    registerItem(ItemIds.GOLD_ORE, {...goldOre, identifier: "gold_ore", name: "Gold Ore"});
    registerItem(ItemIds.LAPIS_ORE, {...lapisOre, identifier: "lapis_ore", name: "Lapis Ore"});
    registerItem(ItemIds.REDSTONE_ORE, {...redstoneOre, identifier: "redstone_ore", name: "Redstone Ore"});
    registerItem(ItemIds.DIAMOND_ORE, {...diamondOre, identifier: "diamond_ore", name: "Diamond Ore"});

    registerItem(ItemIds.DEEPSLATE, {
        identifier: "deepslate",
        name: "Deepslate",
        breakTime: 15,
        drops: [[new ID(ItemIds.COBBLED_DEEPSLATE)]],
        step: S.stepStone,
        dig: S.stepStone,
        break: S.digStone,
        place: S.digStone,
        dropsWithToolTypes: ["pickaxe"],
        intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.WOODEN,
        smeltsTo: new ID(ItemIds.DEEPSLATE),
        smeltXP: 0.4
    });
    registerItem(ItemIds.COBBLED_DEEPSLATE, {
        identifier: "cobbled_deepslate",
        name: "Cobbled Deepslate",
        step: S.stepStone,
        dig: S.stepStone,
        break: S.digStone,
        place: S.digStone,
        breakTime: 5,
        drops: [[new ID(ItemIds.COBBLED_DEEPSLATE)]],
        dropsWithToolTypes: ["pickaxe"],
        intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.WOODEN
    });

    registerItem(ItemIds.DEEPSLATE_COAL_ORE, {
        ...coalOre, identifier: "deepslate_coal_ore", name: "Deepslate Coal Ore", breakTime: 22.5
    });
    registerItem(ItemIds.DEEPSLATE_IRON_ORE, {
        ...ironOre, identifier: "deepslate_iron_ore", name: "Deepslate Iron Ore", breakTime: 22.5
    });
    registerItem(ItemIds.DEEPSLATE_GOLD_ORE, {
        ...goldOre, identifier: "deepslate_gold_ore", name: "Deepslate Gold Ore", breakTime: 22.5
    });
    registerItem(ItemIds.DEEPSLATE_LAPIS_ORE, {
        ...lapisOre, identifier: "deepslate_lapis_ore", name: "Deepslate Lapis Ore", breakTime: 22.5
    });
    registerItem(ItemIds.DEEPSLATE_REDSTONE_ORE, {
        ...redstoneOre, identifier: "deepslate_redstone_ore", name: "Deepslate Redstone Ore", breakTime: 22.5
    });
    registerItem(ItemIds.DEEPSLATE_DIAMOND_ORE, {
        ...diamondOre, identifier: "deepslate_diamond_ore", name: "Deepslate Diamond Ore", breakTime: 22.5
    });

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

    FlowerIds.forEach(([identifier, name, id]) => registerItem(id, {...flowerOptions, identifier, name}));

    registerItem(ItemIds.APPLE, {
        identifier: "apple", name: "Apple", foodPoints: 4, isBlock: false
    });

    registerItem(ItemIds.PLANKS, {
        identifier: "planks", name: "Planks", isBlock: true, step: S.stepWood, dig: S.stepWood, break: S.digWood,
        place: S.digWood, breakTime: 2, intendedToolType: ["axe"], makeSlabs: ItemIds.WOODEN_SLAB, fuel: 1,
        makeStairs: ItemIds.WOODEN_STAIRS, metas: [
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
    });

    registerItem(ItemIds.COAL, {
        identifier: "coal", name: "Coal", isBlock: false, fuel: 2
    });

    registerItem(ItemIds.RAW_IRON, {
        identifier: "raw_iron", name: "Raw Iron", isBlock: false, smeltsTo: new ID(ItemIds.IRON_INGOT), smeltXP: 0.2
    });

    registerItem(ItemIds.RAW_GOLD, {
        identifier: "raw_gold", name: "Raw Gold", isBlock: false, smeltsTo: new ID(ItemIds.GOLD_INGOT), smeltXP: 0.2
    });

    registerItem(ItemIds.LAPIS, {
        identifier: "lapis", name: "Lapis", texture: "lapis_lazuli", isBlock: false
    });

    registerItem(ItemIds.REDSTONE, {
        identifier: "redstone", name: "Redstone", isBlock: false
    });

    registerItem(ItemIds.DIAMOND, {
        identifier: "diamond", name: "Diamond", isBlock: false
    });

    registerItem(ItemIds.CRAFTING_TABLE, {
        identifier: "crafting_table", name: "Crafting Table", breakTime: 3, step: S.stepWood, dig: S.stepWood,
        break: S.digWood, place: S.digWood, intendedToolType: ["axe"], fuel: 1.25, smeltXP: 0.15,
        smeltsTo: new ID(ItemIds.CHARCOAL)
    });

    registerItem(ItemIds.CHEST, {
        identifier: "chest", name: "Chest", breakTime: 3, step: S.stepWood, dig: S.stepWood, break: S.digWood,
        place: S.digWood, intendedToolType: ["axe"], fuel: 1.25, smeltXP: 0.15, smeltsTo: new ID(ItemIds.CHARCOAL),
        isOpaque: false, metas: [
            {name: "Chest", identifier: "chest"},
            {name: "Chest", identifier: "chest_left"},
            {name: "Chest", identifier: "chest_right"}
        ]
    });

    registerItem(ItemIds.FURNACE, {
        identifier: "furnace", name: "Furnace", breakTime: 7.5, step: S.stepStone, dig: S.stepStone, break: S.digStone,
        place: S.digStone, dropsWithToolTypes: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN,
        intendedToolType: ["pickaxe"]
    });

    registerItem(ItemIds.SAND, {
        identifier: "sand", name: "Sand", step: S.stepSand, dig: S.stepSand, break: S.digSand, place: S.digSand,
        breakTime: 0.75, intendedToolType: ["shovel"], canFall: true
    });

    registerItem(ItemIds.GRAVEL, {
        identifier: "gravel", name: "Gravel", step: S.stepGravel, dig: S.stepGravel, break: S.digGravel,
        place: S.digGravel, breakTime: 0.75, intendedToolType: ["shovel"], canFall: true
    });

    registerItem(ItemIds.STICK, {
        identifier: "stick", name: "Stick", isBlock: false
    });

    registerItem(ItemIds.FLINT, {
        identifier: "flint", name: "Flint", isBlock: false
    });

    function registerToolType(name: string, durability: number) {
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
            const lNameT = cName.toLowerCase();
            registerItem(ItemIds[uName + "_" + cNameT.toUpperCase()], {
                ...toolBase, identifier: `${lName}_${lNameT}`, name: `${cName} ${cNameT}`, toolType: <ToolType>lNameT
            });
        }
    }

    registerToolType("wooden", 61);
    registerToolType("stone", 131);
    registerToolType("iron", 250);
    registerToolType("golden", 32);
    registerToolType("diamond", 1561);
    registerToolType("netherite", 2031);
}