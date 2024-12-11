import Item from "@/item/Item";
import Inventory from "@/item/Inventory";

export abstract class Crafting {
    abstract validate(contents: (Item | null)[][]): boolean;
    abstract getResult(contents: (Item | null)[][]): Item | null;
    abstract removeFrom(inventory: Inventory): void;
}