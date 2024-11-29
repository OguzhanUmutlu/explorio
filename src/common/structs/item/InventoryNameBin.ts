import X, {Bin} from "stramp";
import {Inventories} from "../../meta/Inventories";

export const InventoryNameBin = <Bin<Inventories>>X.any.ofValues(Object.values(Inventories));