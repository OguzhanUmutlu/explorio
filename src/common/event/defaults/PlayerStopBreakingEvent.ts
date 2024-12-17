import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/defaults/Player";

export default class PlayerStopBreakingEvent extends PluginEvent {
    constructor(public readonly player: Player) {
        super();
    };
}