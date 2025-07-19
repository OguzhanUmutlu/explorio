import Server from "@/Server";
import Plugin from "@/plugin/Plugin";

export default class Timeout {
    constructor(public server: Server, public plugin: Plugin, public ticks: number, public callback: (timeout: Timeout) => void) {
    };

    cancel() {
        const at = this.server.timeouts.get(this.ticks);
        if (at) at.delete(this);
        this.plugin?._cancellable?.delete(this);
    };
}