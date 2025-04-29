import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/defaults/Player";
import BlockData from "@/item/BlockData";

export default class InteractBlockEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public readonly x: number,
        public readonly y: number,
        public readonly block: BlockData
    ) {
        super();
    };
}