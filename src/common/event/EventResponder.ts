import PluginEvent from "@/event/PluginEvent";
import {ClassOf} from "@/utils/Utils";

export default class EventResponder<T extends PluginEvent = PluginEvent> {
    constructor(public event: ClassOf<T>, public callback: (event: T) => unknown, public priority = 1) {
    };
};