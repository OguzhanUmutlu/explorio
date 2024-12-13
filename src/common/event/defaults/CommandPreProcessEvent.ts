import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";

export class CommandPreProcessEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public readonly message: string
    ) {
        super();
    };
}