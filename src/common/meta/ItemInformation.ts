import Texture, {Canvas} from "@/utils/Texture";
import {default as ID} from "@/item/ItemDescriptor";
import {default as IPool} from "@/item/ItemPool";
import {ItemIds, ItemMetaBits, ItemMetaMax, ItemMetaMaxN} from "@/meta/ItemIds";
import {ClassOf} from "@/utils/Utils";
import BlockData from "@/item/BlockData";
import {MetaLengthMap} from "@/item/ItemFactory";

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
    dataClass?: ClassOf<BlockData>,
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
    breakTimes: Partial<Record<ToolType, number[]>>, // How many seconds it takes to break the block with the intended tools
    requiredToolLevel: ToolLevel,
    dropsWithToolTypes: ToolType[] | "*",
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
    ticksRandomly: boolean,
    postProcessesTexture: boolean,
    hasBiomeTextures: boolean
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
    return (id << ItemMetaBits) | (meta % (MetaLengthMap[id] ?? ItemMetaMax));
}

export const ToolLevels = {
    NONE: 0,
    WOODEN: 1,
    STONE: 2,
    COPPER: 3,
    GOLDEN: 4,
    IRON: 5,
    DIAMOND: 6,
    NETHERITE: 7
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
        breakTimes: {},
        requiredToolLevel: ToolLevels.NONE,
        dropsWithToolTypes: "*",
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
        isStairs: false,
        postProcessesTexture: false,
        hasBiomeTextures: false
    };

    return ret;
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
