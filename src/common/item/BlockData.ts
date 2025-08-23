import {BoundingBox} from "@/entity/BoundingBox";
import {
    BaseBlockBB,
    SlabBottomBB,
    SlabLeftBB,
    SlabRightBB,
    SlabTopBB,
    StairsLeftBottomBB,
    StairsLeftTopBB,
    StairsRightBottomBB,
    StairsRightTopBB
} from "@/meta/BlockCollisions";
import {Texture, createCanvas, Image, texturePlaceholder} from "@/utils/Texture";
import {Item} from "@/item/Item";
import {World} from "@/world/World";
import {randInt, xy2ci} from "@/utils/Utils";
import {im2f, ItemMetaDataConfig} from "@/meta/ItemInformation";
import {ItemIds} from "@/meta/ItemIds";
import {f2data} from "@/item/ItemFactory";

const ext = <new () => ItemMetaDataConfig>class {
};

export class BlockData extends ext {
    fullId: number;
    bbs: BoundingBox[];
    blockRotation: number;
    nonRotatedMeta: number;

    constructor(public id: number, public meta: number, O: ItemMetaDataConfig) {
        super();

        let nonRotatedMeta = meta;

        if (O.isSlab || O.isStairs) {
            nonRotatedMeta %= O.metas.length / 4;
            this.blockRotation = Math.floor(meta / (O.metas.length / 4));
        }

        this.nonRotatedMeta = nonRotatedMeta;

        for (const k in O) this[k] = O[k];

        this.fullId = im2f(id, meta);

        if (O.isSlab) {
            // bottom left top right
            this.bbs = [SlabBottomBB, SlabLeftBB, SlabTopBB, SlabRightBB][this.blockRotation];
        } else if (O.isStairs) {
            this.bbs = [StairsLeftTopBB, StairsRightTopBB, StairsLeftBottomBB, StairsRightBottomBB][this.blockRotation];
        } else this.bbs = BaseBlockBB;
    };

    get name() {
        return this.getName();
    };

    get identifier() {
        return this.getIdentifier();
    };

    [Symbol.toPrimitive]() {
        return this.id;
    };

    get isItem() {
        return !this.isBlock;
    };

    get isTool() {
        return this.toolType !== "none";
    };

    getCollision(bb: BoundingBox, x: number, y: number) {
        if (this.canBePhased) return null;

        for (const k of this.bbs) {
            if (bb.collidesGiven(k.x + x - 0.5, k.y + y - 0.5, k.width, k.height)) return k;
        }

        return null;
    };

    toString() {
        return this.id.toString();
    };

    getName(meta = this.meta) {
        return this.metas[meta % this.metas.length]?.name ?? "Air";
    };

    getIdentifier(meta = this.meta) {
        return this.metas[meta % this.metas.length]?.identifier ?? "air";
    };

    beginPostProcessTexture(image: Image, _biome: number, _block: boolean) {
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        return ctx;
    };

    async postProcessTexture(_ctx: CanvasRenderingContext2D, _biome: number, _block: boolean) {
    };

    reloadTextures() {
        for (const meta of this.metas) {
            delete meta.__processed__;
            delete meta.__processed_biomes__;
        }
        return this;
    };

    reloadProcessedTextures() {
        if (!this.postProcessesTexture && this.texture && (typeof this.texture === "string" || (this.texture instanceof Texture && this.texture.actualSrc))) return this;
        this.reloadTextures();
        return this;
    };

    getTexture(meta = this.meta, block = false, world?: World, x = 0, _y = 0): Texture {
        if (this.id === ItemIds.AIR) return texturePlaceholder;
        const url = this.metas[meta % this.metas.length];
        if (!url) return texturePlaceholder;
        url.blockTexture ??= url.texture;

        const proc = this.hasBiomeTextures
            ? (url.__processed_biomes__ ??= {texture: [], blockTexture: []})
            : (url.__processed__ ??= {texture: null, blockTexture: null});
        const biome = this.hasBiomeTextures ? (world ? world.getChunkAt(x).biome : 0) : 0;
        const key = block ? "blockTexture" : "texture";
        if (!this.hasBiomeTextures && proc[key]) return <Texture>proc[key];
        if (this.hasBiomeTextures && (<Texture[]>proc[key])[biome]) return proc[key][biome];
        const urlV = url[key];
        let texture: Texture;
        if (urlV instanceof Texture) texture = urlV;
        else if (typeof urlV === "string") {
            texture = Texture.get(urlV.includes("/") ? urlV : `assets/textures/${this.isBlock ? "block" : "item"}s/${urlV}.png`);
        } else if (typeof urlV === "function") texture = urlV();
        else texture = new Texture("", urlV);

        if (this.postProcessesTexture) {
            const base = texture;
            texture = new Texture("", new Promise(r => {
                base.wait().then(() => {
                    const ctx = this.beginPostProcessTexture(base.image, biome, block);
                    this.postProcessTexture(ctx, biome, block).then(() => r(ctx.canvas));
                });
            }));
        }

        return this.hasBiomeTextures ? (proc[key][biome] = texture) : (proc[key] = texture);
    };

    getItemTexture(meta = this.meta) {
        return this.getTexture(meta, false);
    };

    getBlockTexture(world: World, x: number, y: number, meta = this.meta) {
        return this.getTexture(meta, true, world, x, y);
    };

    getBreakTime(item: Item | null) {
        const itemMeta = item?.toMetadata();
        if (
            !itemMeta
            || !itemMeta.isTool
            || !(itemMeta.toolType in this.breakTimes)
            || itemMeta.toolLevel < this.requiredToolLevel
        ) return this.breakTime;

        return this.breakTimes[itemMeta.toolType][itemMeta.toolLevel - 1];
    };

    toItem(count = 1) {
        if (this.id === ItemIds.AIR) return null; // air is denoted by null
        return new Item(this.id, this.meta % this.metas.length, count);
    };

    hasTexture() {
        return this.metas.length > 0;
    };

    render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, waitToLoad = true, block = false, world?: World, WX = 0, WY = 0) {
        if (!this.hasTexture()) return;
        const texture = this.getTexture(this.meta, block, world, WX, WY);
        if (!texture.loaded) {
            if (waitToLoad) return texture.wait().then(() => ctx.drawImage(texture.image, x, y, w, h));
            return false;
        }
        ctx.drawImage(texture.image, x, y, w, h);
        return true;
    };

    renderItem(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, waitToLoad = true) {
        return this.render(ctx, x, y, w, h, waitToLoad, false, null, 0, 0);
    };

    renderBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, waitToLoad = true, world?: World, WX = 0, WY = 0) {
        return this.render(ctx, x, y, w, h, waitToLoad, true, world, WX, WY);
    };

    getDrops(item: Item | null = null) {
        const itemMeta = item?.toMetadata() ?? f2data(ItemIds.AIR);
        const itemLevel = itemMeta.toolLevel;
        const itemType = itemMeta.toolType;

        if (
            this.requiredToolLevel > itemLevel
            || (this.dropsWithToolTypes !== "*" && !this.dropsWithToolTypes.includes(itemType))
        ) return [];

        return (this.drops[this.meta % this.drops.length] ?? []).map(i => {
            const item = i.evaluate();
            if (item && item.id === ItemIds.NATURAL_LOG) item.id = ItemIds.LOG;
            return item;
        }).filter(i => i !== null);
    };

    getXPDrops(item: Item | null = null) {
        const itemMeta = item?.toMetadata() ?? f2data(ItemIds.AIR);
        const itemLevel = itemMeta.toolLevel;
        const itemType = itemMeta.toolType;

        if (
            this.requiredToolLevel > itemLevel
            || (this.dropsWithToolTypes !== "*" && !this.dropsWithToolTypes.includes(itemType))
        ) return 0;

        return randInt(this.xpDrops[0], this.xpDrops[1]);
    };

    private randRepl(s: readonly [string, number]) {
        if (!s) return null;
        return "assets/sounds/" + s[0].replace("$", Math.floor(Math.random() * s[1]) + 1 + "");
    };

    randomDig() {
        return this.randRepl(this.dig);
    };

    randomStep() {
        return this.randRepl(this.step);
    };

    randomBreak() {
        return this.randRepl(this.break);
    };

    randomPlace() {
        return this.randRepl(this.place);
    };

    randomTick(_world: World, _x: number, _y: number) {
    };

    isReplaceableBy(id: number) {
        return this.replaceableBy === "*" || this.replaceableBy.includes(id);
    };

    onScheduledBlockUpdate(world: World, x: number, y: number) {
        if (this.isLiquid) {
            const down = world.getBlock(x, y - 1);
            if (down.isReplaceableBy(this.id) && down.id !== this.id) {
                world.setBlock(x, y - 1, this.id, 1);
            } else {
                const blockLeft = world.getBlock(x - 1, y);
                const blockRight = world.getBlock(x + 1, y);
                const blockBottom = world.getBlock(x, y - 1);

                // if it can flow down and the block in the bottom is either any replaceable block
                // or it's a water block that is not a source water nor flowing water that is full
                if (blockBottom.isReplaceableBy(this.id) && (blockBottom.id !== this.id || blockBottom.meta > 1)) {
                    world.setBlock(x, y - 1, this.id, 1);
                    return;
                }

                if (blockLeft.id === this.id && blockRight.id === this.id && blockLeft.meta === 0 && blockRight.meta === 0) {
                    // between two water sources, create a water source
                    if (this.meta === 0) return;
                    world.setBlock(x, y, this.id, 0);
                    return;
                }

                if (
                    this.meta < this.liquidSpread
                    && (this.meta === 0 || !blockBottom.isReplaceableBy(this.id))
                ) {
                    const nextMeta = this.meta === 0 ? 2 : this.meta + 1;

                    const canReplaceLeft = blockLeft.isReplaceableBy(this.id);
                    const canReplaceRight = blockRight.isReplaceableBy(this.id);

                    // spread right/left if it is replaceable, or it's a water block that is lower-level than the
                    // current level minus one. (this.meta+1 refers to 1 level lower)
                    const canSpreadLeft = canReplaceLeft && (blockLeft.id !== this.id || blockLeft.meta > nextMeta);
                    const canSpreadRight = canReplaceRight && (blockRight.id !== this.id || blockRight.meta > nextMeta);

                    if (canSpreadLeft || canSpreadRight) {
                        if (canSpreadLeft) world.setBlock(x - 1, y, this.id, nextMeta);
                        if (canSpreadRight) world.setBlock(x + 1, y, this.id, nextMeta);

                        return;
                    }
                }

                // now it's the draining process, if there's no source block.
                if (this.meta === 0) return;

                const blockTop = world.getBlock(x, y + 1);

                if (blockTop.id === this.id) return; // can never drain itself

                // if the water blocks around are lower than ours, and we are not a source block, we must be drained
                const min = Math.min(blockLeft.id === this.id ? blockLeft.meta : Infinity, blockRight.id === this.id ? blockRight.meta : Infinity);

                if (min >= this.meta) {
                    if (min >= this.liquidSpread) world.setBlock(x, y, ItemIds.AIR);
                    else world.setBlock(x, y, this.id, min + 1);
                }
            }
        }
    };

    onBlockUpdate(world: World, x: number, y: number) {
        delete world.getChunkAt(x).updateSchedules[xy2ci(x, y)];

        if (this.canFall && world.getBlock(x, y - 1).canBePhased) {
            world.setBlock(x, y, ItemIds.AIR);
            world.dropFallingBlock(x, y, this);
            return false;
        }

        if (this.isLiquid) {
            world.scheduleBlockUpdateAt(x, y, this.liquidTicks);
        }

        return true;
    };
}