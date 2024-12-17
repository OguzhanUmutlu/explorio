import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/defaults/Player";

export default class PlayerSpamKickEvent extends PluginEvent {
    kickMessage = "You have been kicked for spamming.";

    constructor(
        public readonly player: Player
    ) {
        super();
    };
}