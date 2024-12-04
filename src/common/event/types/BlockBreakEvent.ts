import PluginEvent from "@/event/PluginEvent";
import {ItemMetadata} from "@/meta/Items";
import Entity from "@/entity/Entity";
import Item from "@/item/Item";

export class BlockBreakEvent extends PluginEvent {
    constructor(public entity: Entity, public x: number, public y: number, public block: ItemMetadata, public drops: Item[]) {
        super();
    };
}