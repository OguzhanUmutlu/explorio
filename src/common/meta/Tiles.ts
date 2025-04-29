import {ClassOf} from "@/utils/Utils";
import Tile from "@/tile/Tile";

export enum TileIds {
    CHEST,
    DOUBLE_CHEST,
    FURNACE,
    __MAX__
}

export const TileNameMap: Record<string, TileIds> = {};

export const TileClasses = <Record<TileIds, ClassOf<Tile>>>{};
