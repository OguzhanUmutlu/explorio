import {PluginEvent} from "@/event/PluginEvent";
import {EventResponder} from "@/event/EventResponder";
import {ClassOf} from "@/utils/Utils";

export class EventManager {
    static events: Map<ClassOf<PluginEvent>, EventResponder[]> = new Map;

    static on<T extends PluginEvent>(event: ClassOf<T>, callback: (event: T) => unknown, priority = 1) {
        let list = this.events.get(event);
        if (!list) this.events.set(event, list = []);

        const responder = new EventResponder(event, callback, priority);

        for (let i = 0; i < list.length; i++) {
            const c = list[i];
            if (priority > c.priority) {
                list.splice(i, 0, responder);
                return;
            }
        }

        list.push(responder);
    };

    static off<T extends PluginEvent>(event: ClassOf<T>, callback: (event: T) => unknown) {
        const list = this.events.get(event);
        if (!list) return;

        while (true) {
            const index = list.findIndex(i => i.callback === callback);
            if (index === -1) break;
            list.splice(index, 1);
        }
    };

    static emit<T extends PluginEvent>(event: T) {
        const list = this.events.get(<ClassOf<T>>event.constructor);
        if (!list) return;

        for (const res of list) {
            res.callback(event);
            if (event.stopped) return;
        }

        return event.cancelled;
    };
}