import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";
import {Containers} from "@/meta/Inventories";

export class PlayerOpenContainerEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public readonly container: Containers
    ) {
        super();
    };
}