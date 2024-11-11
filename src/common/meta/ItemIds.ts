import {ItemMetadata} from "./Items";

export const ITEM_META_BITS = 4;

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
    DIAMOND,

    __MAX__
}

export const I: Record<keyof typeof ItemIds, number> = <any>{};         // I.REDSTONE = item id
export const IS: Record<keyof typeof ItemIds, ItemMetadata> = <any>{};  // IS.REDSTONE = item metadata
export const IM: Record<number, ItemMetadata> = <any>{};                // IM[item id] = item metadata (with meta=0)

export const B: Record<keyof typeof ItemIds, number> = <any>{};         // B.REDSTONE = block full id
export const BM: Record<number, ItemMetadata> = <any>{};                // BM[im2f(I.REDSTONE, 5)] = block metadata

export const ItemsByAccess: Record<string, ItemMetadata> = {};          // ItemsByAccess["stone"] = item/block metadata

for (let i = 0; i < ItemIds.__MAX__; i++) {
    I[ItemIds[i]] = i;
    B[ItemIds[i]] = i << ITEM_META_BITS;
}