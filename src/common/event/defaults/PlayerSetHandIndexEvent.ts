import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";

export class PlayerSetHandIndexEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public handIndex: number
    ) {
        super();
    };
}