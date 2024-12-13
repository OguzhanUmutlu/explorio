import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";
import Inventory from "@/item/Inventory";
import Item from "@/item/Item";

export class PlayerCreativeItemAccessEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public readonly inventory: Inventory,
        public readonly index: number,
        public readonly item: Item
    ) {
        super();
    };
}