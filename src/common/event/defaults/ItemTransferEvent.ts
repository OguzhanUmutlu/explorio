import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/defaults/Player";
import Inventory from "@/item/Inventory";

export default class ItemTransferEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public readonly fromInventory: Inventory,
        public readonly fromIndex: number,
        public readonly to: {
            inventory: Inventory,
            index: number,
            count: number
        }[]
    ) {
        super();
    };
}