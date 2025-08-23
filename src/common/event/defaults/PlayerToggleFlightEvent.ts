import {PluginEvent} from "@/event/PluginEvent";
import {Player} from "@/entity/defaults/Player";

export class PlayerToggleFlightEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public enabled: boolean
    ) {
        super();
    };
}