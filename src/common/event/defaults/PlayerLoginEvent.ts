import PluginEvent from "@/event/PluginEvent";

export default class PlayerLoginEvent extends PluginEvent {
    kickMessage: string | null = null;

    constructor(public readonly name: string, public readonly ip: string) {
        super();
    };
}