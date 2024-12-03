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

    protected constructor(readonly server: Server, readonly metadata: PluginMetadata) {
    };

    onLoad(): void {
    };

    onEnable(): void {
    };

    onDisable(): void {
    };
}