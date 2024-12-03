import PluginEvent from "@/event/PluginEvent";
import {ItemMetadata} from "@/meta/Items";
import Entity from "@/entity/Entity";

export class BlockPlaceEvent extends PluginEvent {
    constructor(public entity: Entity, public x: number, public y: number, public block: ItemMetadata) {
        super();
    };
}