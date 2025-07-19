import {ItemIds} from "@/meta/ItemIds";
import BlockData from "@/item/BlockData";
import World from "@/world/World";
import {im2f} from "@/meta/ItemInformation";

export default class GrassBlock extends BlockData {
    postProcessesTexture = true;
    hasBiomeTextures = true;

    async postProcessTexture(_ctx: CanvasRenderingContext2D, _biome: number): Promise<void> {
        // todo: make a biome based grass texture
    };

    randomTick(world: World, x: number, y: number) {
        const up = world.getBlock(x, y + 1);

        if (up.isOpaque || up.id === ItemIds.NATURAL_LOG) return world.setBlock(x, y, ItemIds.DIRT);

        const right = world.getFullBlockAt(x + 1, y) === im2f(ItemIds.GRASS_BLOCK);
        const left = world.getFullBlockAt(x - 1, y) === im2f(ItemIds.GRASS_BLOCK);

        if (right || left) world.setBlockIfEmpty(x, y, ItemIds.GRASS_BLOCK);
    };
}