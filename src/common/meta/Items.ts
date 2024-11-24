import {Canvas, Texture, texturePlaceholder} from "../utils/Texture";
import {Item, ItemDescriptor as ID, ItemPool as IPool} from "../item/Item";
import {B, BM, I, IM, IS, ITEM_META_BITS} from "./ItemIds";

export type Side = "bottom" | "top" | "left" | "right";
export type ToolType = "none" | "sword" | "axe" | "pickaxe" | "shovel" | "hoe" | "shears";
export type ToolLevel = typeof ToolLevels[keyof typeof ToolLevels];
export type ArmorType = "none" | "helmet" | "chestplate" | "leggings" | "boots";

export type ItemMetaDataConfig = {
    name?: string,
    metas?: { identifier: string, name: string, texture: string | Texture | Canvas | (() => Texture) }[],
    isBlock?: boolean,
    replaceableBy?: number[] | "*",
    canBePlacedOn?: number[] | "*",
    cannotBePlacedOn?: number[],
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
    makeSlabs?: number | null,
    makeStairs?: number | null,
    fireResistance?: number, // how many seconds it takes to burn the block, -1 for not burnable
    isOpaque?: boolean,
    isSlab?: boolean,
    isStairs?: boolean,
    isConsumeable?: boolean,
    foodPoints?: number, // How much food points the item gives
    armorType?: ArmorType,
    armorPoints?: number, // For client side
    maxStack?: number,
    durability?: number // -1 for infinite durability
};

export function f2id(x: number) {
    return x >> ITEM_META_BITS;
}

export function f2meta(x: number) {
    return x & ITEM_META_BITS;
}

export function im2f(id: number, meta: number = 0) {
    return id << ITEM_META_BITS | meta;
}

export const ToolLevels = {
    NONE: 0,
    WOODEN: 1,
    STONE: 2,
    GOLD: 3,
    IRON: 4,
    DIAMOND: 5,
    NETHERITE: 6
} as const;

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

export class ItemMetadata {
    public fullId: number;

    constructor(
        public id: number,
        public meta: number,
        public metas: { identifier: string, name: string, texture: string | Texture | Canvas | (() => Texture) }[],
        public consumeable: boolean,
        public foodPoints: number,
        public armorType: ArmorType,
        public armorPoints: number,
        public durability: number,
        public maxStack: number,
        public fuel: number,
        public isBlock: boolean,
        public smeltsTo: ID | IPool | null,
        public smeltXP: number,
        public replaceableBy: number[] | "*",
        public canBePlacedOn: number[] | "*",
        public cannotBePlacedOn: number[],
        public canBePhased: boolean,
        public drops: (ID | IPool)[] | null,
        public requiresSide: Side[] | null,
        public canFall: boolean,
        public canHoldBlocks: boolean,
        public explodeMaxDistance: number,
        public hardness: number,
        public requiredToolLevel: ToolLevel,
        public dropsWithToolTypes: ToolType[] | "*",
        public intendedToolType: ToolType[] | "*",
        public step: keyof typeof STEP_SOUNDS | null,
        public dig: keyof typeof DIG_SOUNDS | null,
        public solid: boolean,
        public fireResistance: number,
        public isOpaque: boolean,
        public isSlab: boolean,
        public isStairs: boolean
    ) {
        this.fullId = im2f(id, meta);
    };

    [Symbol.toPrimitive]() {
        return this.id;
    };

    toString() {
        return this.id.toString();
    };

    getName(meta = this.meta) {
        return this.metas[meta % this.metas.length].name;
    };

    getIdentifier(meta = this.meta) {
        return this.metas[meta % this.metas.length].identifier;
    };

    getTexture(meta = this.meta): Texture {
        const url = this.metas[meta % this.metas.length];
        if (!url) return texturePlaceholder;
        const urlV = url.texture;
        if (urlV instanceof Texture) return url.texture = urlV;
        if (typeof urlV === "string") return url.texture = Texture.get(urlV);
        if (typeof urlV === "function") return url.texture = urlV();
        return new Texture("", urlV);
    };

    getHardness() {
        return this.hardness; // todo: tools
    };

    toItem(count = 1) {
        if (this.id === 0) return null; // air is denoted by null
        return new Item(this.id, this.meta % this.metas.length, count);
    };

    static fromOptions(id: number, meta: number, O: ItemMetaDataConfig) {
        return new ItemMetadata(
            id, meta, O.metas, O.isConsumeable, O.foodPoints, O.armorType, O.armorPoints,
            O.durability, O.maxStack, O.fuel, O.isBlock, O.smeltsTo, O.smeltXP, O.replaceableBy,
            O.canBePlacedOn, O.cannotBePlacedOn, O.canBePhased, O.drops, O.requiresSide, O.canFall, O.canHoldBlocks,
            O.explodeMaxDistance, O.hardness, O.requiredToolLevel, O.dropsWithToolTypes, O.intendedToolType, O.step,
            O.dig, O.solid, O.fireResistance, O.isOpaque, O.isSlab, O.isStairs
        );
    };
}

export const DefaultItemOptions = (identifier: string, name: string, t: string) => <ItemMetaDataConfig>({
    metas: [{
        identifier,
        name,
        texture: "assets/textures/" + t + "/" + identifier + ".png"
    }],
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

export function introduceItemId(id: number, key: string, isBlock: boolean) {
    if (I[key]) throw new Error("Item already introduced: " + key);
    I[key] = id;
    if (isBlock) B[key] = id << ITEM_META_BITS;
}

export function registerItem(identifier: string, id: number, O: ItemMetaDataConfig) {
    O = {...DefaultItemOptions(identifier, O.name, O.isBlock === false ? "items" : "blocks"), ...O};
    const key = Object.keys(I).find(i => I[i] === id);
    if (!key) throw new Error("First define item id: " + id + ", using introduceItemId(id, key, isBlock)");
    BM[im2f(id, 0)] = ItemMetadata.fromOptions(id, 0, O);
    for (let meta = 1; meta < O.metas.length; meta++) {
        BM[im2f(id, meta)] = ItemMetadata.fromOptions(id, meta, O);
    }
    const baseMeta = IS[key] = IM[id] = BM[id << ITEM_META_BITS];

    if (O.makeSlabs !== null) {
        const slabMeta = registerItem(identifier + "_slab", O.makeSlabs, {
            ...O, isSlab: true, metas: []
        });
        slabMeta.metas = [];
        for (const [index, opt] of Object.entries([
            ["_slab_top", "slabTop"],
            ["_slab_bottom", "slabBottom"]
        ])) for (let i = 0; i < O.metas.length; i++) {
            const meta = +index * O.metas.length + i;
            const dat = O.metas[i];
            slabMeta.metas.push({
                identifier: dat.identifier + opt[0],
                name: dat.name + " Slab",
                texture: () => new Texture("", baseMeta.getTexture(meta)[opt[1]]())
            });
            BM[im2f(O.makeSlabs, meta)] = ItemMetadata.fromOptions(O.makeSlabs, meta, O);
        }
    }
    if (O.makeStairs !== null) {
        const stairsMeta = registerItem(identifier + "_stairs", O.makeSlabs, {
            ...O, isSlab: true, metas: []
        });
        for (const [index, opt] of Object.entries([
            ["_stairs_top_left", "stairsTopLeft"],
            ["_stairs_top_right", "stairsTopRight"],
            ["_stairs_bottom_left", "stairsBottomLeft"],
            ["_stairs_bottom_right", "stairsBottomRight"]
        ])) for (let i = 0; i < O.metas.length; i++) {
            const meta = +index * O.metas.length + i;
            const dat = O.metas[i];
            stairsMeta.metas.push({
                identifier: dat.identifier + opt[0],
                name: dat.name + " Stairs",
                texture: () => new Texture("", baseMeta.getTexture(meta)[opt[1]]())
            });
            BM[im2f(O.makeStairs, meta)] = ItemMetadata.fromOptions(O.makeStairs, meta, O);
        }
    }

    return IM[id];
}

export const FlowerIds = [
    ["allium", "Allium", I.ALLIUM],
    ["blue_orchid", "Blue Orchid", I.BLUE_ORCHID],
    ["dandelion", "Dandelion", I.DANDELION],
    ["houstonia", "Houstonia", I.HOUSTONIA],
    ["orange_tulip", "Orange Tulip", I.ORANGE_TULIP],
    ["oxeye_daisy", "Oxeye Daisy", I.OXEYE_DAISY],
    ["paeonia", "Paeonia", I.PAEONIA],
    ["pink_tulip", "Pink Tulip", I.PINK_TULIP],
    ["red_tulip", "Red Tulip", I.RED_TULIP],
    ["rose", "Rose", I.ROSE],
    ["white_tulip", "White Tulip", I.WHITE_TULIP]
] as const;

export function initItems() {
    registerItem("air", I.AIR, {
        name: "Air", metas: [], canBePhased: true, isOpaque: false, replaceableBy: "*", hardness: -1
    });
    registerItem("bedrock", I.BEDROCK, {
        name: "Bedrock", hardness: -1, step: "stone", dig: "stone", drops: [], explodeMaxDistance: -1
    });
    registerItem("dirt", I.DIRT, {
        name: "Dirt", hardness: 0.75, step: "grass", dig: "grass", intendedToolType: ["shovel"]
    });

    const grassOptions: ItemMetaDataConfig = {
        hardness: 0.75, step: "grass", dig: "grass", drops: [new ID(I.DIRT)], intendedToolType: ["shovel"]
    };
    registerItem("grass_block", I.GRASS_BLOCK, {
        ...grassOptions, name: "Grass Block"
    });
    registerItem("snowy_grass_block", I.SNOWY_GRASS_BLOCK, {
        ...grassOptions, name: "Snowy Grass Block"
    });

    registerItem("glass", I.GLASS, {
        name: "Glass", hardness: 0.5, step: "stone", dig: "glass", intendedToolType: ["pickaxe"], drops: [],
        isOpaque: false
    });

    const stoneOpts: ItemMetaDataConfig = {
        hardness: 7.5, step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"],
        requiredToolLevel: ToolLevels.WOODEN, intendedToolType: ["pickaxe"]
    };
    registerItem("stone", I.STONE, {
        ...stoneOpts, name: "Stone", drops: [new ID(I.COBBLESTONE)]
    });

    const cobbOpts: ItemMetaDataConfig = {
        hardness: 3.3, step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"],
        requiredToolLevel: ToolLevels.WOODEN, intendedToolType: ["pickaxe"]
    };
    registerItem("cobblestone", I.COBBLESTONE, {
        ...cobbOpts, name: "Cobblestone", smeltsTo: new ID(I.STONE), smeltXP: 0.1
    });

    const logOptions: ItemMetaDataConfig = {
        metas: [
            {identifier: "log_oak", name: "Oak Log", texture: "assets/textures/blocks/log_oak.png"},
            {identifier: "log_big_oak", name: "Big Oak Log", texture: "assets/textures/blocks/log_big_oak.png"},
            {identifier: "log_birch", name: "Birch Log", texture: "assets/textures/blocks/log_birch.png"},
            {identifier: "log_jungle", name: "Jungle Log", texture: "assets/textures/blocks/log_jungle.png"},
            {identifier: "log_spruce", name: "Spruce Log", texture: "assets/textures/blocks/log_spruce.png"},
            {identifier: "log_acacia", name: "Acacia Log", texture: "assets/textures/blocks/log_acacia.png"}
        ],
        hardness: 3, step: "wood", dig: "wood", dropsWithToolTypes: ["axe"], intendedToolType: ["axe"],
        fuel: 1.5, smeltXP: 0.15, smeltsTo: new ID(I.CHARCOAL)
    };

    const leavesOptions: ItemMetaDataConfig = {
        metas: [
            {identifier: "oak_leaves", name: "Oak Leaves", texture: "assets/textures/blocks/leaves_oak.png"},
            {
                identifier: "big_oak_leaves",
                name: "Big Oak Leaves",
                texture: "assets/textures/blocks/leaves_big_oak.png"
            },
            {identifier: "birch_leaves", name: "Birch Leaves", texture: "assets/textures/blocks/leaves_birch.png"},
            {
                identifier: "jungle_leaves",
                name: "Jungle Leaves",
                texture: "assets/textures/blocks/leaves_jungle.png"
            },
            {
                identifier: "spruce_leaves",
                name: "Spruce Leaves",
                texture: "assets/textures/blocks/leaves_spruce.png"
            },
            {
                identifier: "acacia_leaves",
                name: "Acacia Leaves",
                texture: "assets/textures/blocks/leaves_acacia.png"
            }
        ],
        hardness: 0.2, step: "grass", dig: "grass", dropsWithToolTypes: ["hoe"], intendedToolType: ["hoe"],
        fuel: 0.2, drops: [new ID(I.APPLE).setChance(0.05)], fireResistance: 5, isOpaque: false
    };

    registerItem("log", I.LOG, logOptions);
    registerItem("leaves", I.LEAVES, leavesOptions);
    registerItem("natural_log", I.NATURAL_LOG, {
        ...logOptions, name: "Natural Log", canBePhased: true, isOpaque: false
    });

    registerItem("gravel", I.GRAVEL, {
        name: "Gravel", hardness: 0.6, canFall: true, step: "gravel", dig: "gravel", intendedToolType: ["shovel"],
        drops: [new IPool([new ID(I.GRAVEL), new ID(I.FLINT)], [90, 10])]
    });
    registerItem("water", I.WATER, {
        drops: [], explodeMaxDistance: -1, solid: false, canBePhased: true, isOpaque: false,
        metas: [
            {identifier: "water", name: "Water", texture: "assets/textures/blocks/water_8.png"},
            {identifier: "water7", name: "Water", texture: "assets/textures/blocks/water_7.png"},
            {identifier: "water6", name: "Water", texture: "assets/textures/blocks/water_6.png"},
            {identifier: "water5", name: "Water", texture: "assets/textures/blocks/water_5.png"},
            {identifier: "water4", name: "Water", texture: "assets/textures/blocks/water_4.png"},
            {identifier: "water3", name: "Water", texture: "assets/textures/blocks/water_3.png"},
            {identifier: "water2", name: "Water", texture: "assets/textures/blocks/water_2.png"},
            {identifier: "water1", name: "Water", texture: "assets/textures/blocks/water_1.png"}
        ]
    });
    registerItem("lava", I.LAVA, {
        drops: [], explodeMaxDistance: -1, solid: false, canBePhased: true,
        metas: [
            {identifier: "lava", name: "Lava", texture: "assets/textures/blocks/lava_8.png"},
            {identifier: "lava7", name: "Lava", texture: "assets/textures/blocks/lava_7.png"},
            {identifier: "lava6", name: "Lava", texture: "assets/textures/blocks/lava_6.png"},
            {identifier: "lava5", name: "Lava", texture: "assets/textures/blocks/lava_5.png"},
            {identifier: "lava4", name: "Lava", texture: "assets/textures/blocks/lava_4.png"},
            {identifier: "lava3", name: "Lava", texture: "assets/textures/blocks/lava_3.png"},
            {identifier: "lava2", name: "Lava", texture: "assets/textures/blocks/lava_2.png"},
            {identifier: "lava1", name: "Lava", texture: "assets/textures/blocks/lava_1.png"}
        ]
    });

    const coalOre: ItemMetaDataConfig = {
        hardness: 15, drops: [new ID(I.COAL)], step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"],
        intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN, smeltsTo: new ID(I.COAL),
        xpDrops: [0, 2], smeltXP: 0.1
    };
    const ironOre: ItemMetaDataConfig = {
        hardness: 15, step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"], drops: [new ID(I.RAW_IRON)],
        intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.STONE, smeltsTo: new ID(I.IRON_INGOT),
        smeltXP: 0.7
    };
    const goldOre: ItemMetaDataConfig = {
        hardness: 15, step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"], drops: [new ID(I.RAW_GOLD)],
        intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.IRON, smeltsTo: new ID(I.GOLD_INGOT),
        smeltXP: 1
    };
    const lapisOre: ItemMetaDataConfig = {
        hardness: 15, drops: [new ID(I.LAPIS)], step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"],
        intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.STONE, smeltsTo: new ID(I.LAPIS),
        smeltXP: 0.7, xpDrops: [0, 1]
    };
    const redstoneOre: ItemMetaDataConfig = {
        hardness: 15, drops: [new ID(I.REDSTONE, 0, [1, 3])], step: "stone", dig: "stone",
        dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.STONE,
        smeltsTo: new ID(I.REDSTONE), smeltXP: 0.7, xpDrops: [0, 3]
    };
    const diamondOre: ItemMetaDataConfig = {
        hardness: 15, drops: [new ID(I.DIAMOND)], step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"],
        intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.IRON, smeltsTo: new ID(I.DIAMOND),
        smeltXP: 1, xpDrops: [0, 3]
    };

    registerItem("coal_ore", I.COAL_ORE, {...coalOre, name: "Coal Ore"});
    registerItem("iron_ore", I.IRON_ORE, {...ironOre, name: "Iron Ore"});
    registerItem("gold_ore", I.GOLD_ORE, {...goldOre, name: "Gold Ore"});
    registerItem("lapis_ore", I.LAPIS_ORE, {...lapisOre, name: "Lapis Ore"});
    registerItem("redstone_ore", I.REDSTONE_ORE, {...redstoneOre, name: "Redstone Ore"});
    registerItem("diamond_ore", I.DIAMOND_ORE, {...diamondOre, name: "Diamond Ore"});

    registerItem("deepslate", I.DEEPSLATE, {
        name: "Deepslate", hardness: 4, drops: [new ID(I.COBBLED_DEEPSLATE)], step: "stone", dig: "stone",
        dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN,
        smeltsTo: new ID(I.DEEPSLATE), smeltXP: 0.4
    });
    registerItem("cobbled_deepslate", I.COBBLED_DEEPSLATE, {
        name: "Cobbled Deepslate", hardness: 5, drops: [new ID(I.COBBLED_DEEPSLATE)], step: "stone", dig: "stone",
        dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN
    });

    registerItem("deepslate_coal_ore", I.DEEPSLATE_COAL_ORE, {
        ...coalOre, name: "Deepslate Coal Ore", hardness: 22.5
    });
    registerItem("deepslate_iron_ore", I.DEEPSLATE_IRON_ORE, {
        ...ironOre, name: "Deepslate Iron Ore", hardness: 22.5
    });
    registerItem("deepslate_gold_ore", I.DEEPSLATE_GOLD_ORE, {
        ...goldOre, name: "Deepslate Gold Ore", hardness: 22.5
    });
    registerItem("deepslate_lapis_ore", I.DEEPSLATE_LAPIS_ORE, {
        ...lapisOre, name: "Deepslate Lapis Ore", hardness: 22.5
    });
    registerItem("deepslate_redstone_ore", I.DEEPSLATE_REDSTONE_ORE, {
        ...redstoneOre, name: "Deepslate Redstone Ore", hardness: 22.5
    });
    registerItem("deepslate_diamond_ore", I.DEEPSLATE_DIAMOND_ORE, {
        ...diamondOre, name: "Deepslate Diamond Ore", hardness: 22.5
    });

    const flowerOptions: ItemMetaDataConfig = {
        isOpaque: false, canBePlacedOn: [I.GRASS_BLOCK, I.SNOWY_GRASS_BLOCK, I.DIRT], canBePhased: true,
        hardness: 0, dig: "grass", step: "grass"
    };

    FlowerIds.forEach(([identifier, name, id]) => registerItem(identifier, id, {...flowerOptions, name}));
}
