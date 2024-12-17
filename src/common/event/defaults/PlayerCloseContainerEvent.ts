import PluginEvent from "@/event/PluginEvent";
import Player from "@/entity/defaults/Player";
import {Containers} from "@/meta/Inventories";

export default class PlayerCloseContainerEvent extends PluginEvent {
    constructor(
        public readonly player: Player,
        public readonly container: Containers
    ) {
        super();
    };
}