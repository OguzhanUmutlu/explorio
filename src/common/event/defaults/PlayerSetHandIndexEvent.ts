import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/defaults/Player";

export default class PlayerSetHandIndexEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public handIndex: number
    ) {
        super();
    };
}