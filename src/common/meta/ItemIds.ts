import BlockData from "@/item/BlockData";

export const ItemMetaBits = 5;
export const ItemMetaMax = 1 << ItemMetaBits;
export const ItemMetaMaxN = ItemMetaMax - 1;

export enum ItemIds {
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
    CRAFTING_TABLE,
    CHEST,
    FURNACE,

    CHARCOAL,
    APPLE,
    STICK,
    FLINT,
    RAW_IRON,
    RAW_GOLD,
    COAL,
    IRON_INGOT,
    GOLD_INGOT,
    LAPIS,
    REDSTONE,
    DIAMOND,

    WOODEN_SWORD,
    WOODEN_AXE,
    WOODEN_PICKAXE,
    WOODEN_SHOVEL,
    WOODEN_HOE,
    STONE_SWORD,
    STONE_AXE,
    STONE_PICKAXE,
    STONE_SHOVEL,
    STONE_HOE,
    IRON_SWORD,
    IRON_AXE,
    IRON_PICKAXE,
    IRON_SHOVEL,
    IRON_HOE,
    GOLDEN_SWORD,
    GOLDEN_AXE,
    GOLDEN_PICKAXE,
    GOLDEN_SHOVEL,
    GOLDEN_HOE,
    DIAMOND_SWORD,
    DIAMOND_AXE,
    DIAMOND_PICKAXE,
    DIAMOND_SHOVEL,
    DIAMOND_HOE,
    NETHERITE_SWORD,
    NETHERITE_AXE,
    NETHERITE_PICKAXE,
    NETHERITE_SHOVEL,
    NETHERITE_HOE,

    __MAX__
}

/*** @description Item id -> Item metadata */
export const Id2Data = <Record<number, BlockData>>{};

/*** @description Maps block full ids to block metadata */
export const FullId2Data = <Record<number, BlockData>>{};

/*** @description Item name -> Item metadata */
export const Items = <Record<keyof typeof ItemIds, BlockData>>{};

/*** @description Uppercase item name -> Full id */
export const FullIds = <Record<keyof typeof ItemIds, number>>{};

/*** @description Maps item identifiers to item metadata */
export const ItemIdentifiers: Record<string, BlockData> = {};

for (let id = 0; id < ItemIds.__MAX__; id++) {
    ItemIds[ItemIds[id]] = id;
    FullIds[ItemIds[id]] = id << ItemMetaBits;
}