import GameOption from "@dom/components/options/classes/GameOption";
import NumberOption from "@dom/components/options/classes/NumberOption";
import ButtonOption from "@dom/components/options/classes/ButtonOption";
import {ReactState} from "@c/utils/Utils";
import OptionMenu from "@dom/components/options/OptionMenu";
import React, {ReactNode} from "react";
import OptionGroup from "@dom/components/options/classes/OptionGroup";
import ToggleOption from "@dom/components/options/classes/ToggleOption";
import SelectOption from "@dom/components/options/classes/SelectOption";
import OptionButtonComponent from "@dom/components/options/OptionButtonComponent";
import JSXOption from "@dom/components/options/classes/JSXOption";
import {saveAndQuit} from "@dom/Client";

abstract class Menu {
    protected constructor(public title: string, public back: OptionPages | null) {
    };

    toReact(pg: ReactState<OptionPages>) {
        return <OptionMenu title={this.title} name={Object.keys(Menus).find(i => Menus[i] === this) as OptionPages}
                           page={pg}
                           back={this.back ? () => pg[1](this.back) : null}>
            {this.preReact(pg)}
        </OptionMenu>;
    };

    abstract preReact(pg: ReactState<OptionPages>): ReactNode;
}

class NormalMenu extends Menu {
    constructor(title: string, back: OptionPages | null, public children: GameOption[]) {
        super(title, back);
    };

    preReact(pg: ReactState<OptionPages>) {
        return <>{...this.children.map(i => i.toReact(pg))}</>;
    };
}

class JSXMenu extends Menu {
    constructor(public title: string, public back: OptionPages | null, public component: (pg: ReactState<OptionPages>) => ReactNode) {
        super(title, back);
    };

    preReact(pg: ReactState<OptionPages>) {
        return this.component(pg);
    };
}

export type OptionPages = "none" | "main" | "index" | "client" | "online" | "skin_customization" | "sound"
    | "video_settings" | "controls" | "language" | "chat" | "resource_packs" | "accessibility" | "animations"
    | "statistics" | "achievements";

export const Menus: Record<OptionPages, Menu> = {
    none: null,
    main: new JSXMenu("test2", null, () => <></>),
    index: new NormalMenu("Options", "none", [
        new OptionGroup([
            new ButtonOption("Online...", "online")
        ]),
        new OptionGroup([
            new ButtonOption("Skin Customization...", "skin_customization"),
            new ButtonOption("Music & Sounds...", "sound")
        ]),
        new OptionGroup([
            new ButtonOption("Video Settings...", "video_settings"),
            new ButtonOption("Controls...", "controls")
        ]),
        new OptionGroup([
            new ButtonOption("Language...", "language"),
            new ButtonOption("Chat Settings...", "chat")
        ]),
        new OptionGroup([
            new ButtonOption("Resource Packs...", "resource_packs"),
            new ButtonOption("Accessibility Settings...", "accessibility")
        ])
    ]),
    client: new NormalMenu("Game Options", null, [
        /*new OptionGroup([
            new SelectOption(null, "Difficulty", "", ["Peaceful", "Easy", "Normal", "Hard"], v => {
                clientNetwork.sendMessage(`/difficulty ${v}`);
            }, 0)
        ]),*/
        new JSXOption(p => <OptionButtonComponent text="Back to game" action={() => p[1]("none")}/>),
        new OptionGroup([
            new ButtonOption("Achievements", "achievements"),
            new ButtonOption("Statistics", "statistics")
        ]),
        new OptionGroup([
            new ButtonOption("Skin Customization...", "skin_customization"),
            new ButtonOption("Music & Sounds...", "sound")
        ]),
        new OptionGroup([
            new ButtonOption("Video Settings...", "video_settings"),
            new ButtonOption("Controls...", "controls")
        ]),
        new OptionGroup([
            new ButtonOption("Language...", "language"),
            new ButtonOption("Chat Settings...", "chat")
        ]),
        new OptionGroup([
            new ButtonOption("Resource Packs...", "resource_packs"),
            new ButtonOption("Accessibility Settings...", "accessibility")
        ]),
        new JSXOption(() => <OptionButtonComponent text={"Save and Quit"} action={() => saveAndQuit()}/>)
    ]),
    statistics: new NormalMenu("Statistics", "main", []),
    achievements: new NormalMenu("Achievements", "main", []),
    online: new NormalMenu("Online Options", "main", []),
    skin_customization: new NormalMenu("Skin Customization", "main", []),
    sound: new NormalMenu("Music & Sound Settings", "main", [
        new NumberOption("master_volume", "Master Volume", "", 0, 100, 1, "%"),
        new OptionGroup([
            new NumberOption("music_volume", "Music", "", 0, 100, 1, "%"),
            new NumberOption("jukebox_volume", "Jukebox/Note Blocks", "", 0, 100, 1, "%")
        ]),
        new OptionGroup([
            new NumberOption("weather_volume", "Weather", "", 0, 100, 1, "%"),
            new NumberOption("blocks_volume", "Blocks", "", 0, 100, 1, "%")
        ]),
        new OptionGroup([
            new NumberOption("hostile_volume", "Hostile Creatures", "", 0, 100, 1, "%"),
            new NumberOption("friendly_volume", "Friendly Creatures", "", 0, 100, 1, "%")
        ]),
        new OptionGroup([
            new NumberOption("players_volume", "Players", "", 0, 100, 1, "%"),
            new NumberOption("ambient_volume", "Ambient/Environment", "", 0, 100, 1, "%")
        ]),
        new OptionGroup([
            new ToggleOption("subtitles", "Show Subtitles", "Shows subtitles in the right bottom corner of the screen"),
            new ToggleOption("directional_audio", "Directional Audio", "Alters every sound to match the direction they are played from")
        ])
    ]),
    video_settings: new NormalMenu("Video Settings", "main", [
        new OptionGroup([
            new SelectOption("graphics", "Graphics", "", ["Fast", "Normal", "Fancy"]),
            new NumberOption("render_distance", "Render Distance", "", 8, 128, 1, " blocks")
        ]),
        new OptionGroup([
            new NumberOption("smooth_lighting", "Smooth Lighting", "Enables gradient shift between block lighting", 0, 100, 1, "%"),
            new NumberOption("simulation_distance", "Simulation Distance", "", 1, 48, 1, " chunks")
        ]),
        new OptionGroup([
            new NumberOption("max_fps", v => `Max Frame Rate: ${v === 0 ? "VSync" : (v === 1000 ? "Infinite" : v)}`, "", 0, 1000, 1),
            new NumberOption("gui_scale", v => `GUI Scale: ${v === 0 ? "Auto" : v}`, "", 0, 3, 1)
        ]),
        new OptionGroup([
            new NumberOption("brightness", "Brightness", "", 0, 100, 1, "%"),
            new NumberOption("camera_speed", "Camera Speed", "Sets the camera speed", 1, 30)
        ]),
        new OptionGroup([
            new ToggleOption("entity_shadows", "Entity Shadows"),
            new ToggleOption("dynamic_zoom", "Dynamic Zoom", "Automatically zooms in and out based on player sprinting and crouching"),
        ]),
        new OptionGroup([
            new ToggleOption("dynamic_lights", "Dynamic Lights"),
            new ButtonOption("Animations...", "animations"),
        ])
    ]),
    controls: new NormalMenu("Controls", "main", []),
    language: new NormalMenu("Language", "main", []),
    chat: new NormalMenu("Chat Settings", "main", [
        new OptionGroup([
            new ToggleOption("chat_visible", "Chat"),
            new ToggleOption("chat_colors", "Colors")
        ]),
        new OptionGroup([
            new ToggleOption("web_links", "Web Links"),
            new ToggleOption("prompt_on_links", "Prompt on Links")
        ]),
        new OptionGroup([
            new NumberOption("chat_text_opacity", "Text Opacity", "", 1, 100, 1, "%"),
            new NumberOption("chat_text_size", "Chat Text Size", "", 1, 100, 1, "%")
        ]),
        new OptionGroup([
            new NumberOption("text_background_opacity", "Background Opacity", "", 0, 100, 1, "%"),
            new NumberOption("line_spacing", "Line Spacing", "", 0, 100, 1, "%")
        ]),
        new OptionGroup([
            new NumberOption("chat_delay", "Chat Delay", "", 0, 100, 1, "%"),
            new NumberOption("chat_width", "Chat Width", "", 0, 100, 1, "px")
        ]),
        new OptionGroup([
            new NumberOption("chat_focused_height", "Focused Height", "", 0, 180, 1, "px"),
            new NumberOption("chat_unfocused_height", "Unfocused Height", "", 0, 180, 1, "px")
        ]),
        new OptionGroup([
            new ToggleOption("command_suggestions", "Command Suggestions")
        ])
    ]),
    resource_packs: new NormalMenu("Resource Packs", "main", []),
    accessibility: new NormalMenu("Accessibility Settings", "main", [
        new OptionGroup([
            new ToggleOption("subtitles", "Subtitles"),
            new ToggleOption("high_contrast", "High Contrast"),
        ]),
        new OptionGroup([
            new NumberOption("auto_save", "Auto Save", "", 10, 600, 1, " seconds")
        ])
    ]),
    animations: new NormalMenu("Animation Settings", "video_settings", [
        new OptionGroup([
            new ToggleOption("water_animated", "Water Animated"),
            new ToggleOption("lava_animated", "Lava Animated")
        ]),
        new OptionGroup([
            new ToggleOption("fire_animated", "Fire Animated"),
            new ToggleOption("portal_animated", "Portal Animated")
        ]),
        new OptionGroup([
            new ToggleOption("redstone_animated", "Redstone Animated"),
            new ToggleOption("explosion_animated", "Explosion Animated")
        ]),
        new OptionGroup([
            new ToggleOption("flame_animated", "Flame Animated"),
            new ToggleOption("smoke_animated", "Smoke Animated")
        ]),
        new OptionGroup([
            new ToggleOption("void_particles", "Void Particles"),
            new ToggleOption("water_particles", "Water Particles")
        ]),
        new OptionGroup([
            new ToggleOption("rain_splash", "Rain Splash"),
            new ToggleOption("portal_particles", "Portal Particles")
        ]),
        new OptionGroup([
            new ToggleOption("potion_particles", "Potion Particles"),
            new ToggleOption("dripping_water_particles", "Water Particles")
        ]),
        new OptionGroup([
            new ToggleOption("dripping_lava_particles", "Lava Particles"),
            new ToggleOption("terrain_animated", "Terrain Animated")
        ]),
        new OptionGroup([
            new ToggleOption("textures_animated", "Textures Animated"),
            new ToggleOption("firework_particles", "Firework Particles")
        ])
    ])
};

export function getMenus(main: "index" | "client", pg: ReactState<OptionPages>) {
    Menus.main = Menus[main];
    return Object.keys(Menus).filter(i => i !== "main" && i !== "none").map(i => Menus[i].toReact(pg));
}