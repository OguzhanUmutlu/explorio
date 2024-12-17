import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/defaults/Player";

export default class CommandPreProcessEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public readonly message: string
    ) {
        super();
    };
}