import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/defaults/Player";

export default class PlayerJoinEvent extends PluginEvent {
    protected readonly cancellable = false;

    constructor(public readonly player: Player) {
        super();
    };
}