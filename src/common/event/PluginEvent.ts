import EventManager from "@/event/EventManager";

export default class PluginEvent {
    cancelled = false;
    stopped = false;

    cancel(v = true) {
        this.cancelled = v;
        return this;
    };

    stop(v = true) {
        this.stopped = v;
    };

    callGetCancel() {
        return EventManager.emit(this);
    };
};