import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";

export class PlayerJoinEvent extends PluginEvent {
    protected readonly cancellable = false;

    constructor(public readonly player: Player) {
        super();
    };
}