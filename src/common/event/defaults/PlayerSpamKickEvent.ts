import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";

export class PlayerSpamKickEvent extends PluginEvent {
    kickMessage = "You have been kicked for spamming.";

    constructor(
        public readonly player: Player
    ) {
        super();
    };
}