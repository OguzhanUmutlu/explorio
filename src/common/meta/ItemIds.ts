import {ItemMetadata} from "@/meta/Items";

export const ItemMetaBits = 5;
export const ItemMetaMax = 1 << ItemMetaBits;

export enum I {
    AIR,
    BEDROCK,
    STONE,
    GRASS_BLOCK,
    SNOWY_GRASS_BLOCK,
    DIRT,
    SAND,
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
    DIAMOND,
    CRAFTING_TABLE,

    __MAX__
}

/**
 * @description Maps item ids to item metadata
 * @example IM[im2f(I.STONE, 5)] // gives metadata for item with id=stone and meta=5
 */
export const IM = <Record<number, ItemMetadata>>{};

/**
 * @description Maps upper case block names to block full ids
 * @example B.REDSTONE // gives block full id for redstone
 */
export const B = <Record<keyof typeof I, number>>{};
/**
 * @description Maps block full ids to block metadata
 * @example BM[im2f(I.REDSTONE, 5)] // gives metadata for block with id=redstone and meta=5
 */
export const BM = <Record<number, ItemMetadata>>{};

/**
 * @description Maps item identifiers to item metadata
 * @example ItemsByIdentifier["stone"] // gives metadata for item with identifier=stone
 */
export const ItemsByIdentifier: Record<string, ItemMetadata> = {};

for (let id = 0; id < I.__MAX__; id++) {
    I[I[id]] = id;
    B[I[id]] = id << ItemMetaBits;
}