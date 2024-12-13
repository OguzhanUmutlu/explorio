import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";
import Inventory from "@/item/Inventory";

export class ItemSwapEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public readonly fromInventory: Inventory,
        public readonly fromIndex: number,
        public readonly toInventory: Inventory,
        public readonly toIndex: number
    ) {
        super();
    };
}