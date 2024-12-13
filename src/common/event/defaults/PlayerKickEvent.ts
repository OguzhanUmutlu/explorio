import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";

export class PlayerKickEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public reason: string
    ) {
        super();
    };
}