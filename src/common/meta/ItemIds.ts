export const ItemIdBits = 10;
export const ItemMetaBits = 16 - ItemIdBits;
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
    CLAY,
    GRAVEL,
    GLASS,
    COBBLESTONE,
    LOG,
    LEAVES,
    NATURAL_LOG,
    WATER,
    LAVA,
    COAL_ORE,
    COPPER_ORE,
    IRON_ORE,
    GOLD_ORE,
    LAPIS_ORE,
    REDSTONE_ORE,
    DIAMOND_ORE,
    DEEPSLATE_COAL_ORE,
    DEEPSLATE_COPPER_ORE,
    DEEPSLATE_IRON_ORE,
    DEEPSLATE_GOLD_ORE,
    DEEPSLATE_LAPIS_ORE,
    DEEPSLATE_REDSTONE_ORE,
    DEEPSLATE_DIAMOND_ORE,
    DEEPSLATE_EMERALD_ORE,
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
    COPPER_BLOCK,
    IRON_BLOCK,
    GOLD_BLOCK,
    DIAMOND_BLOCK,
    RAW_COPPER_BLOCK,
    RAW_IRON_BLOCK,
    RAW_GOLD_BLOCK,
    ANVIL,
    ENTITY_SPAWNER,
    CRAFTING_TABLE,
    CHEST,
    FURNACE,
    CHARCOAL,
    APPLE,
    STICK,
    FLINT,
    RAW_COPPER,
    RAW_IRON,
    RAW_GOLD,
    COAL,
    COPPER_INGOT,
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
    COPPER_SWORD,
    COPPER_AXE,
    COPPER_PICKAXE,
    COPPER_SHOVEL,
    COPPER_HOE,
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

export const FullIds = <Record<keyof typeof ItemIds, number>>{};

for (let i = 0; i < ItemIds.__MAX__; i++) {
    FullIds[ItemIds[i]] = i << ItemMetaBits;
}