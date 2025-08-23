import Tile from "@/tile/Tile";
import Item from "@/item/Item";

export default abstract class ContainerTile extends Tile {
    abstract items: (Item | null)[];
}