import X, {Bin, BufferIndex} from "stramp";
import Inventory from "@/item/Inventory";
import Item from "@/item/Item";
import {InventoryContentStruct} from "@/structs/item/ItemStruct";

export default class InventoryStruct extends Bin<Inventory> {
    name: string;
    listBin: Bin<Item[]>;

    constructor(public size: number) {
        super();

        this.listBin = X.array.typed(InventoryContentStruct).sized(size);
        this.name = `Inventory<${size}>`;
    };

    unsafeWrite(bind: BufferIndex, value: Inventory): void {
        this.listBin.write(bind, value.getContents());
    };

    read(bind: BufferIndex) {
        return new Inventory(this.size).setContents(this.listBin.read(bind));
    };

    unsafeSize(value: Inventory): number {
        return this.listBin.getSize(value.getContents());
    };

    findProblem(value: Inventory, strict?: boolean) {
        return this.listBin.findProblem(value.getContents(), strict);
    };

    get sample() {
        return new Inventory(this.size);
    };
}