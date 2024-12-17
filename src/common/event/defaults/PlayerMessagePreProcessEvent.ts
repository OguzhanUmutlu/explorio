import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/defaults/Player";

export default class PlayerMessagePreProcessEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public message: string
    ) {
        super();
    };
}