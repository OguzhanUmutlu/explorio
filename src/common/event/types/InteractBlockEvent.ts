import PluginEvent from "@/event/PluginEvent";
import {ItemMetadata} from "@/meta/Items";
import Player from "@/entity/types/Player";

export class InteractBlockEvent extends PluginEvent {
    constructor(public player: Player, public x: number, public y: number, public block: ItemMetadata) {
        super();
    };
}