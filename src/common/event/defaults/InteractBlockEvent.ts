import PluginEvent from "@/event/PluginEvent";
import {ItemMetadata} from "@/meta/Items";
import Player from "@/entity/types/Player";

export class InteractBlockEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public readonly x: number,
        public readonly y: number,
        public readonly block: ItemMetadata
    ) {
        super();
    };
}