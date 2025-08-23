import {BlockData} from "@/item/BlockData";
import {ItemIds} from "@/meta/ItemIds";
import {createCanvas, Texture} from "@/utils/Texture";
import {ClassOf} from "@/utils/Utils";
import {ItemDescriptor as ID} from "@/item/ItemDescriptor";
import {DefaultItemOptions, im2f, ItemMetaDataConfig} from "@/meta/ItemInformation";
import {DefaultItems} from "@/item/DefaultItems";

export function im2data(id: number, meta = 0): BlockData {
    return ItemFactory_.f2data[im2f(id, meta)];
}

export function f2data(fullId: number): BlockData {
    return ItemFactory_.f2data[fullId];
}

export function im2name(id: number, meta = 0): string {
    return ItemFactory_.f2name[im2f(id, meta)];
}

export function f2name(fullId: number): string {
    return ItemFactory_.f2name[fullId];
}

export function name2f(identifier: string): number {
    return ItemFactory_.name2f[identifier];
}

export function name2data(identifier: string): BlockData {
    return ItemFactory_.name2data[identifier];
}

export const MetaLengthMap: Record<number, number> = {};

class ItemFactory_ {
    static i2data = <Record<number, BlockData>>{};
    static f2data = <Record<number, BlockData>>{};
    static name2data: Record<string, BlockData> = {};
    static f2name = <Record<number, string>>{};
    static name2f = <Record<number, number>>{};
    static Items = <Record<keyof typeof ItemIds, BlockData>>{};

    registerItem(id: number, _O: Partial<ItemMetaDataConfig>, DataClass: ClassOf<BlockData> = BlockData) {
        if (!_O.metas && (!_O.identifier || !_O.name)) {
            throw new Error("Must define identifier and name if 'metas' keys is not given. ID: " + id);
        }

        const O = <ItemMetaDataConfig>{...DefaultItemOptions(_O), ..._O};
        delete O.identifier;
        delete O.name;
        delete O.texture;

        const key = Object.keys(ItemIds).find(i => ItemIds[i] === id);
        if (!key) throw new Error("First define item id: " + id + ", using introduceItemId(id, key, isBlock)");

        if (!O.drops) {
            O.drops = [];
            for (let meta = 0; meta < O.metas.length; meta++) {
                const nonRotated = O.isSlab || O.isStairs ? meta % (O.metas.length / 4) : meta;
                O.drops.push([new ID(id, nonRotated)]);
            }
        }

        O.metas[0].texture ??= O.metas[0].identifier;

        const identifier = O.metas[0].identifier;
        const fullId = im2f(id);
        const baseMeta = ItemFactory_.i2data[id]
            = ItemFactory_.Items[identifier.toUpperCase()]
            = ItemFactory_.f2data[fullId]
            = ItemFactory_.name2data[identifier] = new DataClass(id, 0, O);

        ItemFactory_.f2name[fullId] = identifier;
        ItemFactory_.name2f[identifier] = fullId;

        if (O.isLiquid) for (let i = 0; i < O.liquidSpread; i++) O.metas.push({
            identifier: identifier + "_flowing_state_" + i,
            name: O.name + " Flowing State " + i,
            texture: () => new Texture("", new Promise(r => {
                const texture = baseMeta.getTexture();
                texture.wait().then(() => {
                    const image = texture.image;
                    const realHeight = image.height;
                    const width = image.width;
                    const height = realHeight * i / O.liquidSpread;
                    const canvas = createCanvas(width, realHeight);
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(image, 0, 0);
                    ctx.clearRect(0, 0, width, height);
                    r(canvas);
                });
            }))
        });

        MetaLengthMap[id] = O.metas.length;

        for (let meta = 1; meta < O.metas.length; meta++) {
            O.metas[meta].texture ??= O.metas[meta].identifier;

            const metadata = new DataClass(id, meta, O);
            const mMetaBuild = O.metas[meta];
            const identifier = mMetaBuild.identifier;
            const fullId = im2f(id, meta);

            ItemFactory_.Items[identifier.toUpperCase()] = ItemFactory_.f2data[fullId] = ItemFactory_.name2data[identifier] = metadata;
            ItemFactory_.f2name[fullId] = identifier;
            ItemFactory_.name2f[identifier] = fullId;
        }

        const slabStairsProtocol = (adder: string, oProp: string, oIsProp: string, nameAdder: string, fnMatch: string[][]) => {
            if (!O[oProp]) return;

            const metas = Array(O.metas.length * fnMatch.length).fill({}).map((_, i) => {
                const dat = O.metas[i % O.metas.length];

                const iMod = Math.floor(i / O.metas.length);
                return {
                    identifier: dat.identifier + adder + (iMod === 0 ? "" : "_" + iMod),
                    name: dat.name + " " + nameAdder,
                    texture: () => new Texture("", new Promise(r => {
                        const texture = baseMeta.getTexture();
                        texture.wait().then(() => r(texture[fnMatch[iMod % fnMatch.length][1]]()));
                    }))
                };
            });

            this.registerItem(O[oProp], {
                ...O, makeSlabs: null, makeStairs: null, [oIsProp]: true, metas, isOpaque: false, drops: null
            });
        };

        slabStairsProtocol("_slab", "makeSlabs", "isSlab", "Slab", [
            ["_slab_bottom", "slabBottom"],
            ["_slab_left", "slabLeft"],
            ["_slab_top", "slabTop"],
            ["_slab_right", "slabRight"]
        ]);

        slabStairsProtocol("_stairs", "makeStairs", "isStairs", "Stairs", [
            ["_stairs_top_left", "stairsTopLeft"],
            ["_stairs_top_right", "stairsTopRight"],
            ["_stairs_bottom_left", "stairsBottomRight"],
            ["_stairs_bottom_right", "stairsBottomLeft"]
        ]);

        return ItemFactory_.i2data[id];
    };

    initDefaultItems() {
        for (const k in DefaultItems) {
            const item = DefaultItems[k];
            this.registerItem(+k, item, item.dataClass || BlockData);
        }
    };
}

export const ItemFactory = ItemFactory_ as typeof ItemFactory_ & Record<number, BlockData>;