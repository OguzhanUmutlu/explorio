import X from "stramp";
import {InventoryName, InventorySizes} from "@/meta/Inventories";

export const InventoryNameBin = X.any.ofValues(...<InventoryName[]>Object.keys(InventorySizes));