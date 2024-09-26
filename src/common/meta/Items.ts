import {Texture} from "../utils/Texture";
import {ItemDescriptor as ID, ItemPool as IPool} from "../item/Item";
import {B, BM, I, IM, IS, ITEM_META_BITS} from "./ItemIds";

export type Side = "bottom" | "top" | "left" | "right";
export type ToolType = "none" | "sword" | "axe" | "pickaxe" | "shovel" | "hoe" | "shears";
export type ToolLevel = typeof ToolLevels[keyof typeof ToolLevels];
export type ArmorType = "none" | "helmet" | "chestplate" | "leggings" | "boots";

export type ItemMetaDataConfig = {
    texture?: string | string[],
    isBlock?: boolean,
    replaceableBy?: number[] | "*",
    isTransparent?: boolean,
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
    durability?: number, // -1 for infinite durability
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
    constructor(
        public id: number,
        public meta: number,
        public texture: string | string[],
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
        public isTransparent: boolean,
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
    };

    [Symbol.toPrimitive]() {
        return this.id;
    };

    toString() {
        return this.id.toString();
    };

    getTexture(meta = this.meta): Texture {
        const url = this.getTextureURL(meta);
        if (!url) return new Texture("");
        return Texture.get(url);
    };

    getTextureURL(meta = this.meta) {
        if (Array.isArray(this.texture)) return this.texture[meta % this.texture.length];
        return this.texture;
    };

    getTextures() {
        if (Array.isArray(this.texture)) return this.texture.map(i => Texture.get(i));
        return [Texture.get(this.texture)];
    };

    getHardness() {
        return this.hardness; // todo: tools
    };
}

export const DefaultItemOptions = (id, t) => <ItemMetaDataConfig>({
    texture: "assets/textures/" + t + "/" + Object.keys(I).find(i => I[i] === id).toLowerCase() + ".png",
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

export function registerItem(id: number, O: ItemMetaDataConfig) {
    O = {...DefaultItemOptions(id, O.isBlock === false ? "items" : "blocks"), ...O};
    const key = Object.keys(I).find(i => I[i] === id);
    if (!key) throw new Error("First define item id: " + id + ", using introduceItemId(id, key, isBlock)");
    const textureNames = Array.isArray(O.texture) ? O.texture : [O.texture];
    for (let meta = 0; meta < textureNames.length; meta++) {
        BM[im2f(id, meta)] = new ItemMetadata(
            id, meta, O.texture, O.isConsumeable, O.foodPoints, O.armorType, O.armorPoints, O.durability, O.maxStack, O.fuel,
            O.isBlock, O.smeltsTo, O.smeltXP, O.replaceableBy, O.isTransparent, O.canBePlacedOn, O.cannotBePlacedOn,
            O.canBePhased, O.drops, O.requiresSide, O.canFall, O.canHoldBlocks, O.explodeMaxDistance, O.hardness,
            O.requiredToolLevel, O.dropsWithToolTypes, O.intendedToolType, O.step, O.dig, O.solid, O.fireResistance,
            O.isOpaque, O.isSlab, O.isStairs
        );
    }
    IS[key] = IM[id] = BM[id << ITEM_META_BITS];

    const textures = (O.makeSlabs || O.makeStairs) && textureNames.map(i => Texture.get(i));

    if (O.makeSlabs !== null) {
        const slabMeta = registerItem(O.makeSlabs, {...O, isSlab: true, texture: []});
        (slabMeta.texture = []).push(
            ...textures.map(t => t.slabTop()),
            ...textures.map(t => t.slabBottom())
        );
    }
    if (O.makeStairs !== null) {
        const stairsMeta = registerItem(O.makeSlabs, {...O, isSlab: true, texture: []});
        (stairsMeta.texture = []).push(
            ...textures.map(t => t.stairsTopLeft()),
            ...textures.map(t => t.stairsTopRight()),
            ...textures.map(t => t.stairsBottomLeft()),
            ...textures.map(t => t.stairsBottomRight())
        );
    }

    return IM[id];
}

export const FlowerIds = [
    I.ALLIUM, I.BLUE_ORCHID, I.DANDELION, I.HOUSTONIA, I.ORANGE_TULIP, I.OXEYE_DAISY,
    I.PAEONIA, I.PINK_TULIP, I.RED_TULIP, I.ROSE, I.WHITE_TULIP
] as const;

export function initItems() {
    registerItem(I.AIR, {
        texture: null, canBePhased: true, isOpaque: false, replaceableBy: "*", hardness: -1
    });
    registerItem(I.BEDROCK, {
        hardness: -1, step: "stone", dig: "stone", drops: [], explodeMaxDistance: -1
    });
    registerItem(I.DIRT, {
        hardness: 0.75, step: "grass", dig: "grass", intendedToolType: ["shovel"]
    });

    const grassOptions: ItemMetaDataConfig = {
        hardness: 0.75, step: "grass", dig: "grass", drops: [new ID(I.DIRT)], intendedToolType: ["shovel"]
    };
    registerItem(I.GRASS_BLOCK, grassOptions);
    registerItem(I.SNOWY_GRASS_BLOCK, grassOptions);

    registerItem(I.GLASS, {
        hardness: 0.5, step: "stone", dig: "glass", intendedToolType: ["pickaxe"], drops: [], isOpaque: false
    });

    const stoneOpts: ItemMetaDataConfig = {
        hardness: 7.5, step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"],
        requiredToolLevel: ToolLevels.WOODEN, intendedToolType: ["pickaxe"]
    };
    registerItem(I.STONE, {...stoneOpts, drops: [new ID(I.COBBLESTONE)]});

    const cobbOpts: ItemMetaDataConfig = {
        hardness: 3.3, step: "stone", dig: "stone", dropsWithToolTypes: ["pickaxe"],
        requiredToolLevel: ToolLevels.WOODEN, intendedToolType: ["pickaxe"]
    };
    registerItem(I.COBBLESTONE, {...cobbOpts, smeltsTo: new ID(I.STONE), smeltXP: 0.1});

    const logOptions: ItemMetaDataConfig = {
        texture: [
            "assets/textures/blocks/log_oak.png",
            "assets/textures/blocks/log_big_oak.png",
            "assets/textures/blocks/log_birch.png",
            "assets/textures/blocks/log_jungle.png",
            "assets/textures/blocks/log_spruce.png",
            "assets/textures/blocks/log_acacia.png"
        ],
        hardness: 3, step: "wood", dig: "wood", dropsWithToolTypes: ["axe"], intendedToolType: ["axe"],
        fuel: 1.5, smeltXP: 0.15, smeltsTo: new ID(I.CHARCOAL)
    };

    const leavesOptions: ItemMetaDataConfig = {
        texture: [
            "assets/textures/blocks/leaves_oak.png",
            "assets/textures/blocks/leaves_big_oak.png",
            "assets/textures/blocks/leaves_birch.png",
            "assets/textures/blocks/leaves_jungle.png",
            "assets/textures/blocks/leaves_spruce.png",
            "assets/textures/blocks/leaves_acacia.png"
        ],
        hardness: 0.2, step: "grass", dig: "grass", dropsWithToolTypes: ["hoe"], intendedToolType: ["hoe"],
        fuel: 0.2, drops: [new ID(I.APPLE).setChance(0.05)], fireResistance: 5, isOpaque: false
    };

    registerItem(I.LOG, logOptions);
    registerItem(I.LEAVES, leavesOptions);
    registerItem(I.NATURAL_LOG, {...logOptions, canBePhased: true, isOpaque: false});

    registerItem(I.GRAVEL, {
        hardness: 0.6, canFall: true, step: "gravel", dig: "gravel", intendedToolType: ["shovel"],
        drops: [new IPool([new ID(I.GRAVEL), new ID(I.FLINT)], [90, 10])]
    });
    registerItem(I.WATER, {
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
    registerItem(I.LAVA, {
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

    registerItem(I.COAL_ORE, coalOre);
    registerItem(I.IRON_ORE, ironOre);
    registerItem(I.GOLD_ORE, goldOre);
    registerItem(I.LAPIS_ORE, lapisOre);
    registerItem(I.REDSTONE_ORE, redstoneOre);
    registerItem(I.DIAMOND_ORE, diamondOre);

    registerItem(I.DEEPSLATE, {
        hardness: 4, drops: [new ID(I.COBBLED_DEEPSLATE)], step: "stone", dig: "stone",
        dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN,
        smeltsTo: new ID(I.DEEPSLATE), smeltXP: 0.4
    });
    registerItem(I.COBBLED_DEEPSLATE, {
        hardness: 5, drops: [new ID(I.COBBLED_DEEPSLATE)], step: "stone", dig: "stone",
        dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN
    });

    registerItem(I.DEEPSLATE_COAL_ORE, {...coalOre, hardness: 22.5});
    registerItem(I.DEEPSLATE_IRON_ORE, {...ironOre, hardness: 22.5});
    registerItem(I.DEEPSLATE_GOLD_ORE, {...goldOre, hardness: 22.5});
    registerItem(I.DEEPSLATE_LAPIS_ORE, {...lapisOre, hardness: 22.5});
    registerItem(I.DEEPSLATE_REDSTONE_ORE, {...redstoneOre, hardness: 22.5});
    registerItem(I.DEEPSLATE_DIAMOND_ORE, {...diamondOre, hardness: 22.5});

    const flowerOptions: ItemMetaDataConfig = {
        isOpaque: false, canBePlacedOn: [I.GRASS_BLOCK, I.SNOWY_GRASS_BLOCK, I.DIRT], canBePhased: true,
        hardness: 0, dig: "grass", step: "grass"
    };

    FlowerIds.forEach(id => registerItem(id, flowerOptions));
}
