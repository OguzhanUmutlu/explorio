import X, {Bin, BufferIndex} from "stramp";
import {Inventory} from "../../item/Inventory";
import {Item} from "../../item/Item";
import ItemStruct from "./ItemStruct";

export default class InventoryStruct extends Bin<Inventory> {
    name: string;
    listBin: Bin<Item[]>;

    constructor(public size: number) {
        super();

        this.listBin = X.array.typed(ItemStruct.or(X.null)).sized(size);
        this.name = `Inventory<${size}>`;
    };

    unsafeWrite(bind: BufferIndex, value: any): void {
        this.listBin.write(bind, value.getContents());
    };

    read(bind: BufferIndex) {
        return new Inventory(this.size).setContents(this.listBin.read(bind));
    };

    unsafeSize(value: any): number {
        return this.listBin.getSize(value.getContents());
    };

    findProblem(value: any, strict?: boolean) {
        return this.listBin.findProblem(value.getContents(), strict);
    };

    get sample(): any {
        return new Inventory(this.size);
    };
}