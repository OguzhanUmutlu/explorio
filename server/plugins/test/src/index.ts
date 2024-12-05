import Plugin from "@/plugin/Plugin";
import {event} from "@/event/EventUtils";
import {BlockBreakEvent} from "@/event/types/BlockBreakEvent";
import Player from "@/entity/types/Player";

export default class MyPlugin extends Plugin {
    onEnable() {
        printer.info("hello, world!");
    };

    @event(BlockBreakEvent)
    onBreakBlock(e: BlockBreakEvent) {
        if (e.block.getName() === "Oak Leaves") {
            e.cancel();
            if (e.entity instanceof Player) e.entity.sendMessage("Hello there! Oak leaves are not breakable! (This is a test plugin located in /plugins/test/)")
        }
    };
}