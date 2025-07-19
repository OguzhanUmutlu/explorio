import {z} from "zod";
import Server, {EventHandlersType} from "@/Server";

export const ZPluginMetadata = z.object({
    name: z.string(),
    version: z.string(),
    main: z.string(),
    api: z.string(),

    website: z.string().optional(),
    description: z.string().optional(),
    prefix: z.string().optional(),
    author: z.string().or(z.string().array()).optional(),
    license: z.string().optional(),
    dependencies: z.string().array().optional()
});

export type PluginMetadata = z.infer<typeof ZPluginMetadata>;

export default abstract class Plugin {
    static _eventHandlers: EventHandlersType = new Map;
    _eventHandlers: EventHandlersType = new Map;
    _intervals: NodeJS.Timeout[] = [];
    _cancellable = new Set<{ cancel: () => void }>;

    protected constructor(readonly server: Server, readonly metadata: PluginMetadata) {
    };

    onLoad(): void {
    };

    onEnable(): void {
    };

    onDisable(): void {
    };

    /**
     * @deprecated Not recommended. Please use tick-based delays instead.
     * @see Plugin.afterFunc
     */
    setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
        const timeout = setTimeout(callback, delay);
        this._intervals.push(timeout);
        return timeout;
    };

    /**
     * @deprecated Not recommended. Please use tick-based intervals instead.
     * @see Plugin.repeatFunc
     */
    setInterval(callback: () => void, delay: number): NodeJS.Timeout {
        const interval = setInterval(callback, delay);
        this._intervals.push(interval);
        return interval;
    };

    afterFunc(ticks: number, callback: () => void) {
        const timeout = this.server.afterFunc(ticks, callback, this);
        this._cancellable.add(timeout);
        return timeout;
    };

    repeatFunc(period: number, callback: () => void) {
        const interval = this.server.repeatFunc(period, callback, this);
        this._cancellable.add(interval);
        return interval;
    };

    repeatFuncDelayed(delay: number, period: number, callback: () => void) {
        const interval = this.server.repeatFuncDelayed(delay, period, callback, this);
        this._cancellable.add(interval);
        return interval;
    };
}