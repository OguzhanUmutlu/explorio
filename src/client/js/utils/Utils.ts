import {EntityIds} from "@/meta/Entities";
import CPlayer from "@c/entity/types/CPlayer";
import {initCommon} from "@/utils/Inits";
import Texture, {Canvas, Image, SkinData} from "@/utils/Texture";
import BoundingBox from "@/entity/BoundingBox";
import {camera, canvas, ctx} from "@dom/Client";
import {ClassOf, SoundFiles} from "@/utils/Utils";
import {useEffect, useState} from "react";
import * as ZenFS from "@zenfs/core";
import {WebStorage} from "@zenfs/dom";

import {Buffer} from "buffer";
import CItemEntity from "@c/entity/types/CItemEntity";
import Item from "@/item/Item";
import CEntity from "@c/entity/CEntity";
import CXPOrbEntity from "@c/entity/types/CXPOrbEntity";
import CFallingBlockEntity from "@c/entity/types/CFallingBlockEntity";
import {SteveDataURL} from "@dom/assets/Steve";

export type Div = HTMLDivElement;
export type Span = HTMLSpanElement;
export type Input = HTMLInputElement;

export type ReactState<T> = ReturnType<typeof useState<T>>;

export function useEventListener(event: string, fn: (e: Event) => void) {
    useEffect(() => {
        document.addEventListener(event, fn);
        return () => document.removeEventListener(event, fn);
    }, []);
}

export function useGroupState<K extends string[], T>(names: K, default_: T) {
    const obj = {};
    for (const k of names) {
        obj[k] = useState(default_);
    }
    return obj as { [k in K[number]]: ReturnType<typeof useState<T>> };
}

const optionSubscribers = new Set<() => void>();

export function useOptionSubscription<K extends keyof typeof Options>(key: K) {
    const [value, setValue] = useState(Options[key]);

    useEffect(() => {
        const update = () => {
            const newValue = Options[key];
            setValue(newValue);
        };

        optionSubscribers.add(update);

        return () => {
            optionSubscribers.delete(update);
        };
    }, []);

    return [value, (v: typeof Options[K]) => {
        Options[key] = v;
        optionSubscribers.forEach(callback => callback());
        saveOptions();
    }] as const;
}

const subscribers = <Record<string, Set<() => void>>>{};

export function useSubscription(key: string, onUpdate?: () => void) {
    const subs = subscribers[key] ??= new Set<() => void>();
    const [value, setValue] = useState(0);

    useEffect(() => {
        const update = () => {
            setValue(value + 1);
            if (onUpdate) onUpdate();
        };

        subs.add(update);

        return () => {
            subs.delete(update);
        };
    }, []);

    return () => subs.forEach(callback => callback());
}

export async function requestFullscreen() {
    for (const key of ["requestFullscreen", "webkitRequestFullscreen", "msRequestFullscreen"]) {
        if (document.documentElement[key]) return await document.documentElement[key]();
    }
}

export function isMobileByAgent() {
    const userAgent = navigator.userAgent.toLowerCase();

    return /iphone|ipod|ipad|android/i.test(userAgent);
}

export function getHash() {
    const hash = location.hash.substring(1);
    if (hash && isValidUUID(hash)) {
        return hash;
    }

    if (hash) location.hash = "";

    return "";
}

export type WorldData = { uuid: string, name: string, seed: number, lastPlayedAt: number };
export type ServerData = {
    uuid: string,
    name: string,
    ip: string,
    port: number,
    lastPlayedAt: number,
    preferSecure: boolean
};

export const ClientEntityClasses = <Record<EntityIds, ClassOf<CEntity>>>{};

export async function initClientThings() {
    // @ts-expect-error .glob is a Vite feature
    SoundFiles.push(...Object.keys(import.meta.glob("../../client/assets/sounds/**/*")));
    loadOptions();
    initClientEntities();
    await initCommon();
    await initBrowserFS();
    // start loading breaking animations in the background immediately
    for (let i = 0; i < 10; i++) Texture.get(`assets/textures/destroy/${i}.png`);
}

export async function initBrowserFS() {
    if (!self.bfs) {
        let electron: unknown;
        if ("electron" in self) electron = self.electron;
        if (typeof electron === "undefined") {
            await ZenFS.configure({
                mounts: {
                    "/": WebStorage.create({storage: localStorage})
                }
            });
            self.bfs = <typeof import("fs")><unknown>ZenFS.fs;
            self.bfs_path = "./singleplayer/";
            if (!bfs.existsSync(bfs_path)) bfs.mkdirSync(bfs_path, {recursive: true});
        } else {
            const el = <{ fs: typeof import("fs"), fs_path: string }>electron;
            self.bfs = el.fs;
            self.bfs_path = el.fs_path;
        }
        self.Buffer = Buffer;
    }
}

export function initClientEntities() {
    ClientEntityClasses[EntityIds.PLAYER] = CPlayer;
    ClientEntityClasses[EntityIds.ITEM] = CItemEntity;
    ClientEntityClasses[EntityIds.XP_ORB] = CXPOrbEntity;
    ClientEntityClasses[EntityIds.FALLING_BLOCK] = CFallingBlockEntity;
}

export function getWSUrls(ip: string, port: number): string[] {
    const isHttps = ip.startsWith("https://");
    const isHttp = ip.startsWith("http://");
    let url = ip;
    if (isHttps) url = url.substring(8);
    else if (isHttp) url = url.substring(7);

    const spl = Math.min(url.indexOf("/"), url.indexOf("#"), url.indexOf("?"));
    url = spl === -1 ? `${url}:${port}` : `${url.substring(0, spl)}:${port}${url.substring(spl)}`;
    if (isHttp || isHttps) return [`${isHttps ? "wss://" : "ws://"}${url}`];
    return [`wss://${url}`, `ws://${url}`];
}

export type OptionsType = {
    fallbackUsername: string;
    skin: string;
    auth: string;

    master_volume: number;
    music_volume: number;
    jukebox_volume: number;
    weather_volume: number;
    blocks_volume: number;
    hostile_volume: number;
    friendly_volume: number;
    players_volume: number;
    ambient_volume: number;
    directional_audio: 0 | 1;

    chat_visible: 0 | 1;
    chat_colors: 0 | 1;
    web_links: 0 | 1;
    prompt_on_links: 0 | 1;
    chat_text_opacity: number;
    text_background_opacity: number;
    chat_text_size: number;
    line_spacing: number;
    chat_delay: number;
    chat_width: number;
    chat_focused_height: number;
    chat_unfocused_height: number;
    command_suggestions: 0 | 1;

    graphics: 0 | 1 | 2;
    render_distance: number;
    smooth_lighting: number;
    simulation_distance: number;
    max_fps: number;
    gui_scale: 0 | 1 | 2 | 3; // 0 = auto
    entity_shadows: 0 | 1;
    brightness: number;
    dynamic_zoom: number;
    dynamic_lights: 0 | 1 | 2; // off, fast fancy
    blur_px: number;

    subtitles: 0 | 1;
    high_contrast: 0 | 1;
    auto_jump: 0 | 1;
    menu_background_blur: number;
    sneak: 0 | 1; // hold / toggle
    sprint: 0 | 1; // hold / toggle
    distortion_effects: number;
    darkness_pulsing: number;
    damage_tilt: number;
    glint_speed: number; // item enchant
    glint_strength: number;
    lightning_flashes: 0 | 1;
    splash_texts: 0 | 1,

    water_animated: 0 | 1;
    lava_animated: 0 | 1;
    fire_animated: 0 | 1;
    portal_animated: 0 | 1;
    redstone_animated: 0 | 1;
    explosion_animated: 0 | 1;
    flame_animated: 0 | 1;
    smoke_animated: 0 | 1;
    void_particles: 0 | 1;
    water_particles: 0 | 1;
    rain_splash: 0 | 1;
    portal_particles: 0 | 1;
    potion_particles: 0 | 1;
    dripping_water_particles: 0 | 1;
    dripping_lava_particles: 0 | 1;
    terrain_animated: 0 | 1;
    textures_animated: 0 | 1;
    firework_particles: 0 | 1;

    auto_save: number;

    camera_speed: number;
    invert_mouse: 0 | 1;
    scroll_sensitivity: number;

    tileSize: number;
    updatesPerSecond: number;
    chatMessageLimit: number;
    particles: number;
    pauseOnBlur: 0 | 1;
};

export const DefaultOptions: OptionsType = {
    fallbackUsername: "Steve",
    skin: SteveDataURL,
    auth: "", //"127.0.0.1:1920",

    // todo: volume types
    master_volume: 100,
    music_volume: 100,
    jukebox_volume: 100,
    weather_volume: 100,
    blocks_volume: 100,
    hostile_volume: 100,
    friendly_volume: 100,
    players_volume: 100,
    ambient_volume: 100,
    directional_audio: 0,

    chat_visible: 1,
    chat_colors: 1,
    web_links: 1,
    prompt_on_links: 1,
    chat_text_opacity: 100,
    text_background_opacity: 100,
    chat_text_size: 100,
    line_spacing: 0,
    chat_delay: 0,
    chat_width: 78,
    chat_focused_height: 180,
    chat_unfocused_height: 90,
    command_suggestions: 1,

    graphics: 0,
    render_distance: 1,
    smooth_lighting: 100,
    simulation_distance: 32,
    max_fps: 0, // VSync
    gui_scale: 0, // auto
    entity_shadows: 0,
    brightness: 100,
    dynamic_zoom: 1,
    dynamic_lights: 0,
    blur_px: 0,

    subtitles: 0,
    high_contrast: 0,
    auto_jump: 0,
    menu_background_blur: 5,
    sneak: 0,
    sprint: 0,
    distortion_effects: 20,
    darkness_pulsing: 100,
    damage_tilt: 100,
    glint_speed: 50,
    glint_strength: 100,
    lightning_flashes: 1,
    splash_texts: 1,

    water_animated: 1,
    lava_animated: 1,
    fire_animated: 1,
    portal_animated: 1,
    redstone_animated: 1,
    explosion_animated: 1,
    flame_animated: 1,
    smoke_animated: 1,
    void_particles: 1,
    water_particles: 1,
    rain_splash: 1,
    portal_particles: 1,
    potion_particles: 1,
    dripping_water_particles: 1,
    dripping_lava_particles: 1,
    terrain_animated: 1,
    textures_animated: 1,
    firework_particles: 1,

    auto_save: 45,

    camera_speed: 12,
    invert_mouse: 0,
    scroll_sensitivity: 100,

    tileSize: 64,
    updatesPerSecond: 60,
    chatMessageLimit: 100,
    particles: 2,
    pauseOnBlur: 1
};

export const Options: OptionsType = {...DefaultOptions};
export const TileSize = {value: 64};

export function loadOptions() {
    Object.assign(Options, JSON.parse(localStorage.getItem("explorio.options")) || {});
    Options.fallbackUsername ||= "Steve";
}

export function saveOptions() {
    localStorage.setItem("explorio.options", JSON.stringify(Options));
}

export function isValidUUID(uuid: string) {
    return getWorldList().some(i => i.uuid === uuid) || getServerList().some(i => i.uuid === uuid);
}

export function getWorldList(): WorldData[] {
    return (<WorldData[]>JSON.parse(localStorage.getItem("explorio.worlds")) || [])
        .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
}

export function addWorld(name: string, seed: number) {
    const worlds = getWorldList();
    const uuid = Date.now().toString(36);
    worlds.push({uuid, name, seed, lastPlayedAt: Date.now()});
    localStorage.setItem("explorio.worlds", JSON.stringify(worlds));
}

export function setWorldOptions(uuid: string, options: Partial<WorldData>) {
    const worlds = getWorldList();
    const index = worlds.findIndex(w => w.uuid === uuid);
    worlds[index] = {...worlds[index], ...options};
    localStorage.setItem("explorio.worlds", JSON.stringify(worlds));
}

export function removeWorld(uuid: string) {
    const worlds = getWorldList();
    const world = worlds.find(i => i.uuid === uuid);
    if (!world) return;

    const pth = bfs_path + uuid;
    if (bfs.existsSync(pth)) bfs.rmSync(pth, {recursive: true});

    worlds.splice(worlds.indexOf(world), 1);
    localStorage.setItem("explorio.worlds", JSON.stringify(worlds));
}

export function getServerList(): ServerData[] {
    return (<ServerData[]>JSON.parse(localStorage.getItem("explorio.servers") || "[]"))
        .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
}

export function addServer(name: string, ip: string, port: number) {
    const servers = getServerList();
    servers.push({uuid: Date.now().toString(36), name, ip, port, lastPlayedAt: Date.now(), preferSecure: true});
    localStorage.setItem("explorio.servers", JSON.stringify(servers));
}

export function setServerOptions(uuid: string, options: Partial<ServerData>) {
    const servers = getServerList();
    const index = servers.findIndex(s => s.uuid === uuid);
    servers[index] = {...servers[index], ...options};
    localStorage.setItem("explorio.servers", JSON.stringify(servers));
}

export function removeServer(uuid: string) {
    const servers = getServerList()
        .filter(s => s.uuid !== uuid);

    localStorage.setItem("explorio.servers", JSON.stringify(servers));
}

export async function pingServer(ip: string, port: number): Promise<string> {
    const res = await fetch(`http://${ip}:${port}/ws-ping`);
    return res.statusText;
}

export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, opacity: number) {
    if (opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = "black";
    ctx.fillRect(x, y, w, h);
    ctx.restore();
}

export function drawShadowImage(ctx: CanvasRenderingContext2D, image: Image, x: number, y: number, w: number, h: number, opacity: number) {
    ctx.drawImage(image, x, y, w, h);
    const p = 0.5;
    drawShadow(ctx, x - p, y - p, w + p * 2, h + p * 2, opacity);
}

function renderHandItem(
    ctx: CanvasRenderingContext2D,
    item: Item,
    armBody: number[],
    bodyRotation: boolean,
    SIZE: number,
    shadowOpacity: number
) {
    const metadata = item.toMetadata();
    const texture = metadata.getItemTexture();

    if (metadata.toolType !== "none") {
        drawShadowImage(ctx,
            bodyRotation ? texture.image : texture.flip(),
            bodyRotation ? -armBody[2] * 0.25 : -armBody[2] * 2, armBody[3] * 0.2,
            SIZE * 0.6, SIZE * 0.6, shadowOpacity
        );
    } else drawShadowImage(ctx,
        texture.image,
        bodyRotation ? 0 : -armBody[2] * 1.5, armBody[3] * 0.8,
        SIZE * 0.4, SIZE * 0.4, shadowOpacity
    );
}

// Renderers are here because we may render them outside the game like the main menu's skin preview feature
export function renderPlayerModel(
    ctx: CanvasRenderingContext2D, O: {
        SIZE: number, bbPos: { x: number, y: number }, bb: BoundingBox, skin: SkinData, bodyRotation: boolean,
        leftArmRotation: number, leftLegRotation: number, rightLegRotation: number, rightArmRotation: number,
        headRotation: number, handItem: Item, offhandItem: Item, shadowOpacity: number
    }
) {
    const side: Record<string, Canvas> = O.skin[O.bodyRotation ? 0 : 1];

    const head = [
        O.bbPos.x, O.bbPos.y - (O.bb.height + 0.21) * O.SIZE,
        O.SIZE * 0.5, O.SIZE * 0.5
    ];

    const armBody = [
        O.bbPos.x + 0.125 * O.SIZE, O.bbPos.y - (O.bb.height - 0.29) * O.SIZE,
        O.SIZE * 0.25, O.SIZE * 0.75
    ];

    const leg = [
        O.bbPos.x + 0.125 * O.SIZE, O.bbPos.y - (O.bb.height - 1.04) * O.SIZE,
        O.SIZE * 0.25, O.SIZE * 0.75
    ];

    ctx.save();
    ctx.translate(armBody[0] + armBody[2] / 2, armBody[1]);
    ctx.rotate(O.leftArmRotation);
    drawShadowImage(ctx, side.back_arm, -armBody[2] / 2, 0, armBody[2], armBody[3], O.shadowOpacity);

    if (O.offhandItem) {
        renderHandItem(ctx, O.offhandItem, armBody, O.bodyRotation, O.SIZE, O.shadowOpacity);
    }

    ctx.restore();

    ctx.save();
    ctx.translate(leg[0] + leg[2] / 2, leg[1]);
    ctx.rotate(O.leftLegRotation);
    drawShadowImage(ctx, side.back_leg, -leg[2] / 2, 0, leg[2], leg[3], O.shadowOpacity);
    ctx.restore();

    drawShadowImage(ctx, side.body, armBody[0], armBody[1], armBody[2], armBody[3], O.shadowOpacity);

    ctx.save();
    ctx.translate(leg[0] + leg[2] / 2, leg[1]);
    ctx.rotate(O.rightLegRotation);
    drawShadowImage(ctx, side.front_leg, -leg[2] / 2, 0, leg[2], leg[3], O.shadowOpacity);
    ctx.restore();

    ctx.save();
    ctx.translate(armBody[0] + armBody[2] / 2, armBody[1]);
    ctx.rotate(O.rightArmRotation);
    ctx.fillStyle = "white";
    drawShadowImage(ctx, side.front_arm, -armBody[2] / 2, 0, armBody[2], armBody[3], O.shadowOpacity);

    if (O.handItem) {
        renderHandItem(ctx, O.handItem, armBody, O.bodyRotation, O.SIZE, O.shadowOpacity);
    }

    ctx.restore();

    ctx.save();
    ctx.translate(head[0] + head[2] / 2, head[1] + head[3] * 0.55);
    ctx.rotate((O.headRotation + (O.bodyRotation ? 0 : 180)) * Math.PI / 180);
    ctx.drawImage(side.head, -head[2] / 2, -head[3] / 2, head[2], head[3]);
    head[0] -= 0.015 * O.SIZE;
    head[1] -= 0.015 * O.SIZE;
    head[3] = head[2] += 0.03 * O.SIZE;
    ctx.drawImage(side.head_topping, -head[2] / 2, -head[3] / 2, head[2], head[3]);
    drawShadow(ctx, -head[2] / 2, -head[3] / 2, head[2], head[3], O.shadowOpacity);
    ctx.restore();
}

export function getClientPosition(x: number, y: number) {
    return {
        x: (x - camera.x) * TileSize.value + canvas.width / 2,
        y: (-y + camera.y) * TileSize.value + canvas.height / 2
    };
}

export function renderBoundingBox(bb: BoundingBox) {
    const {x, y} = getClientPosition(bb.x, bb.y);
    ctx.strokeRect(x, y, bb.width * TileSize.value, -bb.height * TileSize.value);
}

export function drawDotTo(x: number, y: number) {
    const pos = getClientPosition(x, y);
    ctx.fillStyle = "red";
    ctx.fillRect(pos.x - 4, pos.y - 4, 8, 8);
}

export function formatDivText(div: Div, text: string) {
    div.classList.add("message");
    // l = bold
    // u = underline
    // s = strikethrough
    // i = italics
    // k = obfuscated
    let parent = div;
    const sep = text.split(/(§§[\da-f]|§[\da-flusikr]|:[a-z]+:)/);
    for (const part of sep) {
        if (/^§§[\da-f]|§[\da-flusikr]$/.test(part)) {
            const dv = document.createElement("div");
            dv.style.display = "contents";
            parent.appendChild(dv);

            if (/^§[\da-f]$/.test(part)) {
                dv.style.color = `var(--color-${part[1]})`;
            } else if (/^§§[\da-f]$/.test(part)) {
                dv.style.backgroundColor = `var(--color-${part[2]})`;
            } else switch (part[1]) {
                case "l":
                    dv.style.fontWeight = "bold";
                    break;
                case "u":
                    dv.style.textDecoration = "underline";
                    break;
                case "s":
                    dv.style.textDecoration = "line-through";
                    break;
                case "i":
                    dv.style.fontStyle = "italic";
                    break;
                case "k":
                    dv.style.fontStyle = "oblique";
                    break;
                case "r":
                    dv.style.fontWeight = "normal";
                    dv.style.textDecoration = "none";
                    dv.style.fontStyle = "normal";
                    dv.style.color = "white";
                    dv.style.backgroundColor = "transparent";
                    break;
            }
            parent = dv;
        } else if (/^:[a-z]+:$/.test(part) && [
            "eyes", "nerd", "skull", "slight_smile"
        ].includes(part.slice(1, -1))) {
            const emote = document.createElement("div");
            emote.classList.add("emote");
            const emotePath = `assets/textures/emotes/${part.slice(1, -1)}.png`;
            emote.style.backgroundImage = `url(${emotePath})`;
            parent.appendChild(emote);
        } else {
            parent.appendChild(document.createTextNode(part));
        }
    }
}