import PluginEvent from "@/event/PluginEvent";
import {ItemMetadata} from "@/meta/Items";
import Entity from "@/entity/Entity";

export default class BlockPlaceEvent extends PluginEvent {
    constructor(
        public readonly entity: Entity,
        public readonly x: number,
        public readonly y: number,
        public readonly block: ItemMetadata
    ) {
        super();
    };
}