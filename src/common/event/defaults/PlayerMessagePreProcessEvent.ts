import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";

export class PlayerMessagePreProcessEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public message: string
    ) {
        super();
    };
}