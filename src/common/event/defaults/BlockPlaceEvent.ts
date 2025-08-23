import {PluginEvent} from "@/event/PluginEvent";

import {BlockData} from "@/item/BlockData";
import {Entity} from "@/entity/Entity";

export class BlockPlaceEvent extends PluginEvent {
    constructor(
        public readonly entity: Entity,
        public readonly x: number,
        public readonly y: number,
        public readonly block: BlockData
    ) {
        super();
    };
}