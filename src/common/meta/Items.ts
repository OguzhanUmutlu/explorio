import Texture, {Canvas, texturePlaceholder} from "@/utils/Texture";
import Item from "@/item/Item";
import {default as ID} from "@/item/ItemDescriptor";
import {default as IPool} from "@/item/ItemPool";
import {B, BM, I, IM, IS, ItemIds, ItemMetaBits, ItemMetaMax} from "@/meta/ItemIds";
import BoundingBox from "@/entity/BoundingBox";
import {BaseBlockBB, SlabBottomBB, SlabLeftBB, SlabRightBB, SlabTopBB} from "@/meta/BlockCollisions";

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
    step?: typeof S[keyof typeof S] | null, // null for no sound
    dig?: typeof S[keyof typeof S] | null, // null for no sound
    break?: typeof S[keyof typeof S] | null, // null for no sound
    place?: typeof S[keyof typeof S] | null, // null for no sound
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
    return x >> ItemMetaBits;
}

export function f2meta(x: number) {
    return x & ItemMetaBits;
}

export function im2f(id: number, meta: number = 0) {
    const m = IM[id];
    const maxMeta = m ? m.metas.length : ItemMetaMax;
    return id << ItemMetaBits | (meta % maxMeta);
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

export const S = {
    "digCloth": ["assets/sounds/dig/cloth$.ogg", 4],
    "digCoral": ["assets/sounds/dig/coral$.ogg", 4],
    "digGlass": ["assets/sounds/dig/glass$.ogg", 3],
    "digGrass": ["assets/sounds/dig/grass$.ogg", 4],
    "digGravel": ["assets/sounds/dig/gravel$.ogg", 4],
    "digSand": ["assets/sounds/dig/sand$.ogg", 4],
    "digSnow": ["assets/sounds/dig/snow$.ogg", 4],
    "digStone": ["assets/sounds/dig/stone$.ogg", 4],
    "digWetGrass": ["assets/sounds/dig/wet_grass$.ogg", 4],
    "digWood": ["assets/sounds/dig/wood$.ogg", 4],
    "stepCloth": ["assets/sounds/step/cloth$.ogg", 4],
    "stepCoral": ["assets/sounds/step/coral$.ogg", 4],
    "stepGrass": ["assets/sounds/step/grass$.ogg", 4],
    "stepGravel": ["assets/sounds/step/gravel$.ogg", 4],
    "stepLadder": ["assets/sounds/step/ladder$.ogg", 5],
    "stepSand": ["assets/sounds/step/sand$.ogg", 4],
    "stepScaffold": ["assets/sounds/step/scaffold$.ogg", 7],
    "stepSnow": ["assets/sounds/step/snow$.ogg", 4],
    "stepStone": ["assets/sounds/step/stone$.ogg", 4],
    "stepWetGrass": ["assets/sounds/step/wet_grass$.ogg", 4],
    "stepWood": ["assets/sounds/step/wood$.ogg", 4]
} as const;

export class ItemMetadata {
    fullId: number;
    bbs: BoundingBox[];
    blockRotation: number;

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
        public step: typeof S[keyof typeof S] | null,
        public dig: typeof S[keyof typeof S] | null,
        public breakSound: typeof S[keyof typeof S] | null,
        public place: typeof S[keyof typeof S] | null,
        public solid: boolean,
        public fireResistance: number,
        public isOpaque: boolean,
        public isSlab: boolean,
        public isStairs: boolean
    ) {
        let nonRotatedMeta = meta;
        if (isSlab || isStairs) {
            nonRotatedMeta %= this.metas.length / 4;
            this.blockRotation = Math.floor(meta / (this.metas.length / 4));
        }
        this.drops ??= [new ID(id, nonRotatedMeta)];
        this.fullId = im2f(id, meta);

        if (this.isSlab) {
            // bottom left top right
            this.bbs = [SlabBottomBB, SlabLeftBB, SlabTopBB, SlabRightBB][this.blockRotation];
        } else if (this.isStairs) {

        } else this.bbs = BaseBlockBB;
    };

    [Symbol.toPrimitive]() {
        return this.id;
    };

    private randRepl(s: readonly [string, number]) {
        if (!s) return null;
        return s[0].replace("$", Math.floor(Math.random() * s[1]) + 1 + "");
    };

    getCollision(bb: BoundingBox, x: number, y: number) {
        if (this.canBePhased) return null;

        for (const k of this.bbs) {
            if (bb.collidesGiven(k.x + x - 0.5, k.y + y - 0.5, k.width, k.height)) return k;
        }

        return null;
    };

    randomDig() {
        return this.randRepl(this.dig);
    };

    randomStep() {
        return this.randRepl(this.step);
    };

    randomBreak() {
        return this.randRepl(this.breakSound);
    };

    randomPlace() {
        return this.randRepl(this.place);
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
        if (urlV instanceof Texture) return urlV;
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

    hasTexture() {
        return this.metas.length > 0;
    };

    render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, waitToLoad = true) {
        if (!this.hasTexture()) return;
        const texture = this.getTexture();
        if (!texture.loaded) {
            if (waitToLoad) texture.wait().then(() => ctx.drawImage(texture.image, x, y, w, h));
            return false;
        }
        ctx.drawImage(texture.image, x, y, w, h);
        return true;
    };

    getDrops() {
        return this.drops.map(i => {
            const item = i.evaluate();
            if (item && item.id === ItemIds.NATURAL_LOG) item.id = ItemIds.LOG;
            return item;
        }).filter(i => i !== null);
    };

    static fromOptions(id: number, meta: number, O: ItemMetaDataConfig) {
        return new ItemMetadata(
            id, meta, O.metas, O.isConsumeable, O.foodPoints, O.armorType, O.armorPoints,
            O.durability, O.maxStack, O.fuel, O.isBlock, O.smeltsTo, O.smeltXP, O.replaceableBy,
            O.canBePlacedOn, O.cannotBePlacedOn, O.canBePhased, O.drops, O.requiresSide, O.canFall, O.canHoldBlocks,
            O.explodeMaxDistance, O.hardness, O.requiredToolLevel, O.dropsWithToolTypes, O.intendedToolType, O.step,
            O.dig, O.break, O.place, O.solid, O.fireResistance, O.isOpaque, O.isSlab, O.isStairs
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
    break: null,
    place: null,
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
    if (isBlock) B[key] = id << ItemMetaBits;
}

export function registerItem(identifier: string, id: number, O: ItemMetaDataConfig) {
    O = {...DefaultItemOptions(identifier, O.name, O.isBlock === false ? "items" : "blocks"), ...O};
    const key = Object.keys(I).find(i => I[i] === id);
    if (!key) throw new Error("First define item id: " + id + ", using introduceItemId(id, key, isBlock)");
    BM[im2f(id, 0)] = ItemMetadata.fromOptions(id, 0, O);
    for (let meta = 1; meta < O.metas.length; meta++) {
        BM[im2f(id, meta)] = ItemMetadata.fromOptions(id, meta, O);
    }
    const baseMeta = IS[key] = IM[id] = BM[id << ItemMetaBits];

    function slabStairsProtocol(adder: string, oProp: string, oIsProp: string, nameAdder: string, fnMatch: string[][]) {
        if (!O[oProp]) return;

        const metas = Array(O.metas.length * fnMatch.length);
        const newMetadata = registerItem(identifier + adder, O[oProp], {
            ...O, makeSlabs: null, makeStairs: null, [oIsProp]: true, metas, isOpaque: false
        });
        for (const [index, opt] of Object.entries(fnMatch)) for (let i = 0; i < O.metas.length; i++) {
            const meta = +index * O.metas.length + i;
            const dat = O.metas[i];
            metas[meta] = {
                identifier: dat.identifier + opt[0],
                name: dat.name + " " + nameAdder,
                texture: () => new Texture("", new Promise(r => {
                    const texture = baseMeta.getTexture(meta);
                    texture.wait().then(() => r(texture[opt[1]]()));
                }))
            };
            BM[im2f(O[oProp], meta)] = ItemMetadata.fromOptions(O[oProp], meta, {
                ...newMetadata,
                drops: O.drops
            });
        }
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
        ["_stairs_bottom_left", "stairsBottomLeft"],
        ["_stairs_bottom_right", "stairsBottomRight"]
    ]);

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
        step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        drops: [], name: "Bedrock", hardness: -1, explodeMaxDistance: -1
    });
    registerItem("dirt", I.DIRT, {
        step: S.stepGrass, dig: S.stepGrass, break: S.digGrass, place: S.digGrass,
        name: "Dirt", hardness: 0.75,
        intendedToolType: ["shovel"]
    });

    const grassOptions: ItemMetaDataConfig = {
        hardness: 0.75, step: S.stepGrass, dig: S.stepGrass, break: S.digGrass, place: S.digGrass,
        drops: [new ID(I.DIRT)], intendedToolType: ["shovel"]
    };
    registerItem("grass_block", I.GRASS_BLOCK, {
        ...grassOptions, name: "Grass Block"
    });
    registerItem("snowy_grass_block", I.SNOWY_GRASS_BLOCK, {
        ...grassOptions, name: "Snowy Grass Block"
    });

    registerItem("glass", I.GLASS, {
        name: "Glass", hardness: 0.5, step: S.stepStone, dig: S.stepStone, break: S.digGlass, place: S.digStone,
        intendedToolType: ["pickaxe"], drops: [], isOpaque: false
    });

    const stoneOpts: ItemMetaDataConfig = {
        hardness: 7.5, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        dropsWithToolTypes: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN, intendedToolType: ["pickaxe"]
    };
    registerItem("stone", I.STONE, {
        ...stoneOpts, name: "Stone", drops: [new ID(I.COBBLESTONE)]
    });

    const cobbOpts: ItemMetaDataConfig = {
        hardness: 3.3, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        dropsWithToolTypes: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN, intendedToolType: ["pickaxe"]
    };
    registerItem("cobblestone", I.COBBLESTONE, {
        ...cobbOpts, name: "Cobblestone", smeltsTo: new ID(I.LOG), smeltXP: 0.1
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
        hardness: 3, step: S.stepWood, dig: S.stepWood, break: S.digWood, place: S.digWood, dropsWithToolTypes: ["axe"],
        intendedToolType: ["axe"], fuel: 1.5, smeltXP: 0.15, smeltsTo: new ID(I.CHARCOAL)
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
        hardness: 0.2, step: S.stepGrass, dig: S.stepGrass, break: S.digGrass, place: S.digGrass,
        dropsWithToolTypes: ["hoe"], intendedToolType: ["hoe"], fuel: 0.2, drops: [new ID(I.APPLE).setChance(0.05)],
        fireResistance: 5, isOpaque: false
    };

    registerItem("log", I.LOG, logOptions);
    registerItem("leaves", I.LEAVES, leavesOptions);
    registerItem("natural_log", I.NATURAL_LOG, {
        ...logOptions, name: "Natural Log", canBePhased: true, isOpaque: false
    });

    registerItem("gravel", I.GRAVEL, {
        step: S.stepGravel, dig: S.stepGravel, break: S.digGravel, place: S.digGravel,
        name: "Gravel", hardness: 0.6, canFall: true, intendedToolType: ["shovel"],
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
        step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        hardness: 15, drops: [new ID(I.COAL)], dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.WOODEN, smeltsTo: new ID(I.COAL), xpDrops: [0, 2], smeltXP: 0.1
    };
    const ironOre: ItemMetaDataConfig = {
        hardness: 15, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        dropsWithToolTypes: ["pickaxe"], drops: [new ID(I.RAW_IRON)], intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.STONE, smeltsTo: new ID(I.IRON_INGOT), smeltXP: 0.7
    };
    const goldOre: ItemMetaDataConfig = {
        hardness: 15, step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        dropsWithToolTypes: ["pickaxe"], drops: [new ID(I.RAW_GOLD)], intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.IRON, smeltsTo: new ID(I.GOLD_INGOT), smeltXP: 1
    };
    const lapisOre: ItemMetaDataConfig = {
        step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        hardness: 15, drops: [new ID(I.LAPIS)], dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.STONE, smeltsTo: new ID(I.LAPIS), smeltXP: 0.7, xpDrops: [0, 1]
    };
    const redstoneOre: ItemMetaDataConfig = {
        hardness: 15, drops: [new ID(I.REDSTONE, 0, [1, 3])], step: S.stepStone, dig: S.stepStone, break: S.digStone,
        place: S.digStone, dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.STONE, smeltsTo: new ID(I.REDSTONE), smeltXP: 0.7, xpDrops: [0, 3]
    };
    const diamondOre: ItemMetaDataConfig = {
        step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        hardness: 15, drops: [new ID(I.DIAMOND)], dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.IRON, smeltsTo: new ID(I.DIAMOND), smeltXP: 1, xpDrops: [0, 3]
    };

    registerItem("coal_ore", I.COAL_ORE, {...coalOre, name: "Coal Ore"});
    registerItem("iron_ore", I.IRON_ORE, {...ironOre, name: "Iron Ore"});
    registerItem("gold_ore", I.GOLD_ORE, {...goldOre, name: "Gold Ore"});
    registerItem("lapis_ore", I.LAPIS_ORE, {...lapisOre, name: "Lapis Ore"});
    registerItem("redstone_ore", I.REDSTONE_ORE, {...redstoneOre, name: "Redstone Ore"});
    registerItem("diamond_ore", I.DIAMOND_ORE, {...diamondOre, name: "Diamond Ore"});

    registerItem("deepslate", I.DEEPSLATE, {
        name: "Deepslate", hardness: 4, drops: [new ID(I.COBBLED_DEEPSLATE)], step: S.stepStone, dig: S.stepStone,
        break: S.digStone, place: S.digStone, dropsWithToolTypes: ["pickaxe"], intendedToolType: ["pickaxe"],
        requiredToolLevel: ToolLevels.WOODEN, smeltsTo: new ID(I.DEEPSLATE), smeltXP: 0.4
    });
    registerItem("cobbled_deepslate", I.COBBLED_DEEPSLATE, {
        step: S.stepStone, dig: S.stepStone, break: S.digStone, place: S.digStone,
        name: "Cobbled Deepslate", hardness: 5, drops: [new ID(I.COBBLED_DEEPSLATE)], dropsWithToolTypes: ["pickaxe"],
        intendedToolType: ["pickaxe"], requiredToolLevel: ToolLevels.WOODEN
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
        hardness: 0, dig: S.stepGrass, break: S.digGrass, place: S.digGrass, step: S.stepGrass
    };

    FlowerIds.forEach(([identifier, name, id]) => registerItem(identifier, id, {...flowerOptions, name}));

    registerItem("apple", I.APPLE, {
        name: "Apple", foodPoints: 4, isBlock: false
    });

    registerItem("planks", I.PLANKS, {
        name: "Planks", isBlock: true, step: S.stepWood, dig: S.stepWood, break: S.digWood, place: S.digWood,
        hardness: 2, dropsWithToolTypes: ["axe"], intendedToolType: ["axe"], makeSlabs: I.WOODEN_SLAB,
        makeStairs: I.WOODEN_STAIRS, metas: [
            {name: "Oak Planks", identifier: "oak_planks", texture: "assets/textures/blocks/planks_oak.png"},
            {
                name: "Big Oak Planks",
                identifier: "big_oak_planks",
                texture: "assets/textures/blocks/planks_big_oak.png"
            },
            {name: "Birch Planks", identifier: "birch_planks", texture: "assets/textures/blocks/planks_birch.png"},
            {name: "Jungle Planks", identifier: "jungle_planks", texture: "assets/textures/blocks/planks_jungle.png"},
            {name: "Spruce Planks", identifier: "spruce_planks", texture: "assets/textures/blocks/planks_spruce.png"},
            {name: "Acacia Planks", identifier: "acacia_planks", texture: "assets/textures/blocks/planks_acacia.png"}
        ]
    });

    registerItem("coal", I.COAL, {
        name: "Coal", isBlock: false, fuel: 2
    });

    registerItem("raw_iron", I.RAW_IRON, {
        name: "Raw Iron", isBlock: false, smeltsTo: new ID(ItemIds.IRON_INGOT), smeltXP: 0.2
    });

    registerItem("raw_gold", I.RAW_GOLD, {
        name: "Raw Gold", isBlock: false, smeltsTo: new ID(ItemIds.GOLD_INGOT), smeltXP: 0.2
    });

    registerItem("lapis", I.LAPIS, {
        name: "Lapis", isBlock: false
    });

    registerItem("redstone", I.REDSTONE, {
        name: "Redstone", isBlock: false
    });

    registerItem("diamond", I.DIAMOND, {
        name: "Diamond", isBlock: false
    });
}
