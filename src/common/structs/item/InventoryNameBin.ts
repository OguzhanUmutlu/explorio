import X from "stramp";
import {Inventories} from "@/meta/Inventories";

export const InventoryNameBin = X.any.ofValues(Object.values(Inventories));