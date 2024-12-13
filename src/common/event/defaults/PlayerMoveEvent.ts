import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";

export class PlayerMoveEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public readonly x: number,
        public readonly y: number,
        public readonly rotation: number
    ) {
        super();
    };
}