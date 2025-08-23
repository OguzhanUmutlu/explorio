import {Tile} from "@/tile/Tile";
import {Item} from "@/item/Item";

export abstract class ContainerTile extends Tile {
    abstract items: (Item | null)[];
}