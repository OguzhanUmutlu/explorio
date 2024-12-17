import PluginEvent from "@/event/PluginEvent";
import {ItemMetadata} from "@/meta/Items";
import Item from "@/item/Item";
import Entity from "@/entity/Entity";

export default class BlockBreakEvent extends PluginEvent {
    constructor(
        public readonly entity: Entity,
        public readonly x: number,
        public readonly y: number,
        public readonly block: ItemMetadata,
        public readonly drops: Item[]
    ) {
        super();
    };
}