import {ClassOf} from "@/utils/Utils";
import {PluginEvent} from "@/event/PluginEvent";
import {EventHandlersType} from "@/Server";

export function event(event: ClassOf<PluginEvent>, priority = 1) {
    return function (target: object, propertyKey: string) {
        const c = <{ _eventHandlers: EventHandlersType }><unknown>target.constructor;

        const all = c._eventHandlers ??= new Map;

        let list = all.get(event);
        if (!list) all.set(event, list = []);

        list.push([priority, propertyKey]);
    };
}