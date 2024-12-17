import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/defaults/Player";

export default class PlayerKickEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public reason: string
    ) {
        super();
    };
}