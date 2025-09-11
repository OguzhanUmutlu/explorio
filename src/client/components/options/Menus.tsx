import {GameOption} from "@dom/components/options/classes/GameOption";
import {NumberOption} from "@dom/components/options/classes/NumberOption";
import {ButtonOption} from "@dom/components/options/classes/ButtonOption";
import {Options, ReactState, ResourcePack, saveOptions, useOptionSubscription, useSubscription} from "@c/utils/Utils";
import {OptionMenu} from "@dom/components/options/OptionMenu";
import React, {ReactNode, useState} from "react";
import {OptionGroup} from "@dom/components/options/classes/OptionGroup";
import {ToggleOption} from "@dom/components/options/classes/ToggleOption";
import {SelectOption} from "@dom/components/options/classes/SelectOption";
import {OptionButtonComponent} from "@dom/components/options/OptionButtonComponent";
import {JSXOption} from "@dom/components/options/classes/JSXOption";
import {saveAndQuit, states} from "@dom/Client";
import {GameOptionComponent} from "@dom/components/options/GameOptionComponent";
import {deleteCookie, getCookie, setCookie} from "@dom/components/CookieHandler";
import {InputOptionComponent} from "@dom/components/options/InputOptionComponent";
import {VersionString} from "@/Versions";
import {ResourcePackComponent} from "@dom/components/ResourcePackComponent";
import {FileAsync} from "ktfile";

abstract class Menu {
    protected constructor(public title: string, public back: OptionPages | null, public backName = "Done") {
    };

    toReact(pg: ReactState<OptionPages>) {
        return <OptionMenu title={this.title} name={Object.keys(Menus).find(i => Menus[i] === this) as OptionPages}
                           page={pg}
                           back={this.back ? () => pg[1](this.back) : null}
                           backName={this.backName}>
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
    constructor(public title: string, public back: OptionPages | null, backName: string, public component: (pg: ReactState<OptionPages>) => ReactNode) {
        super(title, back, backName);
    };

    preReact(pg: ReactState<OptionPages>) {
        return this.component(pg);
    };
}

export type OptionPages = "none" | "main" | "index" | "client" | "online" | "skin_customization" | "sound"
    | "video_settings" | "controls" | "language" | "chat" | "resource_packs" | "accessibility" | "credits"
    | "animations" | "statistics" | "achievements" | "mouse" | "key_binds" | "login";

export const TokenCookieName = "__explorio__private__token__";
export const UsernameCookieName = "__explorio__private__username__";

export const Menus: Record<OptionPages, Menu> = {
    none: null,
    main: new JSXMenu("test2", null, "", () => <></>),
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
        ]),
        new ButtonOption("Credits & Attributions", "credits")
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
    online: new JSXMenu("Online Options", "main", "Done", pg => {
        const updateLoggedIn = useSubscription("loggedIn");
        const token = getCookie(TokenCookieName);
        const username = getCookie(UsernameCookieName);
        const loggedIn = token && username;
        const fallbackUsername = useOptionSubscription("fallbackUsername");

        return <>
            <InputOptionComponent option="auth" text="Auth URL"/>
            <GameOptionComponent class="option-input" description="">
                <label>Username</label>:
                <input placeholder="Steve" value={loggedIn ? username : fallbackUsername[0]}
                       onChange={e => {
                           fallbackUsername[1](e.target.value);
                       }} disabled={!!loggedIn} type="text"
                       maxLength={20}/>
            </GameOptionComponent>
            {
                loggedIn
                    ? <OptionButtonComponent text="Log Out" action={() => {
                        deleteCookie(TokenCookieName);
                        deleteCookie(UsernameCookieName);
                        updateLoggedIn();
                    }}/>
                    : <OptionButtonComponent text="Log In" action={() => pg[1]("login")}/>
            }
        </>;
    }),
    login: new JSXMenu("Log In", "online", "Back", page => {
        const updateLoggedIn = useSubscription("loggedIn");

        const username = useState("");
        const password = useState("");
        const trying = useState(false);

        return <>
            <GameOptionComponent class="option-input" description="">
                <label>Username</label>: <input type="text" value={username[0]}
                                                onChange={e => username[1](e.target.value)}/>
            </GameOptionComponent>
            <GameOptionComponent class="option-input" description="">
                <label>Password</label>: <input type="password" value={password[0]}
                                                onChange={e => password[1](e.target.value)}/>
            </GameOptionComponent>
            <OptionButtonComponent text="Log In" disabled={trying[0]} action={async () => {
                if (trying[0]) return;
                trying[1](true);
                let serv = Options.auth;
                if (serv.endsWith("/")) serv = serv.slice(0, -1);
                if (!serv.startsWith("http://") && !serv.startsWith("https://")) serv = "http://" + serv;

                const response = await fetch(serv + "/login", {
                    headers: {
                        "Content-Type": "application/json"
                    },
                    method: "POST",
                    body: JSON.stringify({username: username[0], password: password[0]})
                }).catch(e => e);

                if (response instanceof Error) {
                    trying[1](false);
                    console.error(response);
                    alert(response.message);
                    return;
                }

                if (response.statusText !== "OK") {
                    trying[1](false);
                    alert(response.statusText);
                    return;
                }

                const token = await response.text();

                setCookie(TokenCookieName, token);
                setCookie(UsernameCookieName, username[0]);
                updateLoggedIn();

                trying[1](false);

                page[1]("online");
            }}/>
        </>;
    }),
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
        ]),
        new NumberOption("blur_px", "Blur", "Gaussian blur px value", 0, 30, 1)
    ]),
    controls: new NormalMenu("Controls", "main", [
        new OptionGroup([
            new ButtonOption("Mouse Settings...", "mouse"),
            new ButtonOption("Key Binds...", "key_binds")
        ]),
        new OptionGroup([
            new SelectOption("sneak", "Sneak", "", ["Hold", "Toggle"]),
            new SelectOption("sprint", "Sprint", "", ["Hold", "Toggle"])
        ]),
        new OptionGroup([
            new ToggleOption("auto_jump", "Auto Jump")
        ])
    ]),
    mouse: new NormalMenu("Mouse Settings", "controls", [
        new OptionGroup([
            new NumberOption("camera_speed", "Camera Speed", "", 1, 30, 1),
            new ToggleOption("invert_mouse", "Invert Mouse")
        ]),
        new OptionGroup([
            new NumberOption("scroll_sensitivity", "Scroll Sensitivity", "", 1, 200, 1)
        ])
    ]),
    key_binds: new JSXMenu("Mouse Settings", "controls", "Done", () => {
        return <>
            Todo
        </>;
    }),
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
    resource_packs: new JSXMenu("Resource Packs", null, null, pg => {
        const packs = (states.resourcePacks || [Options.resourcePacks])[0];
        const save = () => {
            states.resourcePacks[1](Options.resourcePacks = packs);
            saveOptions();
        };
        return <>
            <div className="resource-packs">
                <ResourcePackComponent pack={{name: `Explorio ${VersionString}`, description: "", enabled: true}}
                                       packs={packs}
                                       save={save}
                                       isDefault={true}/>
                {packs.map(pack => <ResourcePackComponent pack={pack} packs={packs} save={save} key={pack.name}/>)}
            </div>
            <div className="option-split">
                <OptionButtonComponent text="Add Resource Pack" action={async () => {
                    let handle = await window.showDirectoryPicker({startIn: "desktop"}).catch(() => null as null);
                    if (!handle) return;
                    let description = "Imported from " + handle.name;

                    async function decide(handle: FileSystemDirectoryHandle) {
                        const hasTextures = await handle.getDirectoryHandle("textures").catch(() => null as null);
                        if (!hasTextures) {
                            for await(const file of handle.values()) {
                                if (file.kind === "directory") {
                                    const subHandle = await decide(file as FileSystemDirectoryHandle);
                                    if (subHandle) return subHandle;
                                }
                            }
                        } else return handle;
                        return null;
                    }

                    handle = await decide(handle);
                    if (!handle) {
                        alert("No textures folder found in the selected directory!");
                        return;
                    }

                    async function addFile(path: FileAsync, handle: FileSystemFileHandle) {
                        const file = await handle.getFile();
                        if (/^pack\.[a-zA-Z_]+meta$/.test(file.name)) {
                            try {
                                const meta = JSON.parse(await file.text());
                                if (meta.description || meta.pack.description) description = meta.description || meta.pack.description;
                            } catch {
                                //
                            }
                        }
                        const buffer = await file.arrayBuffer();
                        await path.write(Buffer.from(buffer));
                    }

                    async function addFiles(path: FileAsync, handle: FileSystemDirectoryHandle) {
                        for await (const [name, file] of handle.entries()) {
                            const newPath = path.to(name);
                            if (file.kind === "file") {
                                await addFile(newPath, file as FileSystemFileHandle);
                            } else if (file.kind === "directory") {
                                await newPath.mkdir();
                                await addFiles(newPath, file as FileSystemDirectoryHandle);
                            }
                        }
                    }

                    const packsFolder = bfs.to("texture_packs");

                    await packsFolder.mkdir();

                    const packFolder = packsFolder.to(handle.name);
                    if (await packFolder.exists()) {
                        alert(`A resource pack with this name already exists! (${handle.name}) Either remove the existing one or rename the new one.`);
                        return;
                    }

                    await packFolder.mkdir();

                    await addFiles(packFolder, handle);

                    const pack: ResourcePack = {
                        name: handle.name, description, enabled: true
                    };

                    packs.push(pack);
                    save();
                }}/>
                <OptionButtonComponent text="Done" action={() => pg[1]("main")}/>
            </div>
        </>;
    }),
    accessibility: new NormalMenu("Accessibility Settings", "main", [
        new OptionGroup([
            new NumberOption("auto_save", "Auto Save", "", 0, 60, 1, " seconds"),
            new ToggleOption("pauseOnBlur", "Pause on Blur")
        ])
    ]),
    credits: new JSXMenu("Credits & Attributions", "index", "Done", () => {
        return <span style={{textAlign: "center"}}>
            <p>Explorio Version: {VersionString}</p>
            <h3>Attributions</h3>
            <p>
                <a href="http://github.com/zen-fs" target="_blank"><strong>ZenFS</strong></a> - MIT License<br/>
            </p>
        </span>;
    }),
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
    let keys = Object.keys(Menus)
        .filter(i => i !== "main" && i !== "none");

    if (main === "client") keys = keys.filter(i => i !== "online" && i !== "login");

    return keys.map(i => Menus[i].toReact(pg));
}