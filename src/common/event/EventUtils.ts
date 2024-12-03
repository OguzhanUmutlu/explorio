import {ClassOf} from "@/utils/Utils";
import PluginEvent from "@/event/PluginEvent";
import "reflect-metadata";

export function event(event: ClassOf<PluginEvent>, priority = 1) {
    return function (target: any, propertyKey: string) {
        target.constructor._eventHandlers ??= new Map;

        const all = target.constructor._eventHandlers;

        let list = all.get(event);
        if (!list) all.set(event, list = []);

        list.push([priority, propertyKey]);
    };
}