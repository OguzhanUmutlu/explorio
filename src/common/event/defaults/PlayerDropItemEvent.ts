import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/defaults/Player";
import Item from "@/item/Item";
import Inventory from "@/item/Inventory";

export default class PlayerDropItemEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public readonly inventory: Inventory,
        public readonly index: number,
        public readonly count: number,
        public readonly item: Item
    ) {
        super();
    };
}