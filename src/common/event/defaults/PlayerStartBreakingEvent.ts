import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";

export class PlayerStartBreakingEvent extends PluginEvent {
    constructor(public readonly player: Player) {
        super();
    };
}