import Plugin from "@/plugin/Plugin";
import {event} from "@/event/EventUtils";
import {BlockBreakEvent} from "@/event/types/BlockBreakEvent";

export default class MyPlugin extends Plugin {
    onEnable() {
        console.log("hello, world!");
    };

    @event(BlockBreakEvent)
    onBreakBlock(e: BlockBreakEvent) {
        if (e.block.getName() === "Oak Leaves") {
            e.cancel();
        }
    };
}

