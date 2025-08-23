import {PluginEvent} from "@/event/PluginEvent";

export class PlayerLoginEvent extends PluginEvent {
    kickMessage: string | null = null;

    constructor(public readonly name: string, public readonly ip: string) {
        super();
    };
}