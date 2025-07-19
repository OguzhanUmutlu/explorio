import X, {Bin, BufferIndex} from "stramp";
import Inventory from "@/item/Inventory";
import Item from "@/item/Item";
import {InventoryContentStruct} from "@/structs/item/ItemStruct";

export default class InventoryStruct extends Bin<Inventory> {
    isOptional = false as const;
    name: string;
    listBin: Bin<Item[]>;

    constructor(public size: number, public invName: string) {
        super();

        this.listBin = X.array.typed(InventoryContentStruct).sized(size);
        this.name = `Inventory<${size}, name=${invName}>`;
    };

    unsafeWrite(bind: BufferIndex, value: Inventory): void {
        this.listBin.write(bind, value.getContents());
    };

    read(bind: BufferIndex) {
        return new Inventory(this.size, this.invName).setContents(this.listBin.read(bind));
    };

    unsafeSize(value: Inventory): number {
        return this.listBin.getSize(value.getContents());
    };

    findProblem(value: Inventory, strict?: boolean) {
        return this.listBin.findProblem(value.getContents(), strict);
    };

    get sample() {
        return new Inventory(this.size, this.invName);
    };
}