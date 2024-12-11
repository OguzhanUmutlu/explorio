import EventManager from "@/event/EventManager";

export default abstract class PluginEvent {
    protected cancellable = true;
    cancelled = false;
    stopped = false;

    cancel(v = true) {
        if (!this.cancellable) throw new Error("Event is not cancellable.");
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