import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";
import Inventory from "@/item/Inventory";

export class ItemTransferEvent extends PluginEvent {
    constructor(
        public player: Player,
        public fromInventory: Inventory,
        public fromIndex: number,
        public toInventory: Inventory,
        public toIndex: number,
        public count: number
    ) {
        super();
    };
}