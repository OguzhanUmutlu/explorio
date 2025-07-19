import Server from "@/Server";
import Plugin from "@/plugin/Plugin";

export default class Interval {
    constructor(public server: Server, public plugin: Plugin, public next: number, public period: number, public callback: (interval: Interval) => void) {
    };

    cancel() {
        this.server.intervals.delete(this);
        this.plugin?._cancellable?.delete(this);
    };
}