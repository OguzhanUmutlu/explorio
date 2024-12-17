import PluginEvent from "@/event/PluginEvent";
import {ItemMetadata} from "@/meta/Items";
import Player from "@/entity/defaults/Player";

export default class InteractBlockEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public readonly x: number,
        public readonly y: number,
        public readonly block: ItemMetadata
    ) {
        super();
    };
}