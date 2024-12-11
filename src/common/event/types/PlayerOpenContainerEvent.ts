import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/types/Player";
import {Containers} from "@/meta/Inventories";

export class PlayerOpenContainerEvent extends PluginEvent {
    constructor(
        public player: Player,
        public container: Containers
    ) {
        super();
    };
}