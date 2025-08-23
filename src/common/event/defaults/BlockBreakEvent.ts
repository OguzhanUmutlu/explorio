import {PluginEvent} from "@/event/PluginEvent";
import {Item} from "@/item/Item";

import {BlockData} from "@/item/BlockData";
import {Entity} from "@/entity/Entity";

export class BlockBreakEvent extends PluginEvent {
    constructor(
        public readonly entity: Entity,
        public readonly x: number,
        public readonly y: number,
        public readonly block: BlockData,
        public readonly drops: Item[],
        public readonly xpDrops: number
    ) {
        super();
    };
}