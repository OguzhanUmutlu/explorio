import {Entities, EntityBoundingBoxes} from "@/meta/Entities";
import CPlayer from "@c/entity/types/CPlayer";
import {initCommon} from "@/utils/Inits";
import Texture, {Canvas} from "@/utils/Texture";
import BoundingBox from "@/entity/BoundingBox";
import {camera, canvas, ctx} from "@dom/Client";
import {ClassOf, SoundFiles} from "@/utils/Utils";
import {useState} from "react";
import {configure, fs} from "@zenfs/core";
import {WebStorage} from "@zenfs/dom";
import Entity from "@/entity/Entity";
import {Buffer} from "buffer";
import CItemEntity from "@c/entity/types/CItemEntity";

export type Div = HTMLDivElement;
export type Span = HTMLSpanElement;
export type Input = HTMLInputElement;

export const URLPrefix = "/explorio/";

export type ReactState<T> = ReturnType<typeof useState<T>>;

export function useGroupState<K extends string[], T>(names: K, default_: T) {
    const obj = {};
    for (const k of names) {
        obj[k] = useState(default_);
    }
    return obj as { [k in K[number]]: ReturnType<typeof useState<T>> };
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

function initClientPrinter() {
    printer.tags.warn.textColor = "none";
    printer.tags.error.textColor = "none";
}

export const ClientEntityClasses = <Record<Entities, ClassOf<Entity>>>{};

export async function initClientThings() {
    SoundFiles.push(...Object.keys(import.meta.glob("../../client/assets/sounds/**/*")));
    initClientPrinter();
    loadOptions();
    initClientEntities();
    await initCommon();
    await initBrowserFS();
    // start loading breaking animations in the background immediately
    for (let i = 0; i < 10; i++) Texture.get(`assets/textures/destroy/${i}.png`);
}

export async function initBrowserFS() {
    if (!self.bfs) {
        await configure({
            mounts: {
                "/": WebStorage.create({storage: localStorage})
            }
        });
        self.bfs = <typeof import("fs")><unknown>fs;
        self.Buffer = Buffer;
    }
}

export function initClientEntities() {
    ClientEntityClasses[Entities.PLAYER] = CPlayer;
    ClientEntityClasses[Entities.ITEM] = CItemEntity;
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
    username: string;
    music: number;
    sfx: number;
    cameraSpeed: number;
    tileSize: number;
    updatesPerSecond: number;
    chatLimit: number;
    particles: number;
    pauseOnBlur: 0 | 1;
};

export let Options: OptionsType;

export function loadOptions() {
    Options = JSON.parse(localStorage.getItem("explorio.options")) || {};
    Options.username ??= "Steve";
    Options.music ??= 100;
    Options.sfx ??= 100;
    Options.cameraSpeed ??= 12;
    Options.tileSize ??= 64;
    Options.updatesPerSecond ??= 60;
    Options.chatLimit ??= 100;
    Options.particles ??= 2;
    Options.pauseOnBlur ??= 1;
    return Options;
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

    bfs.rmSync("./singleplayer/" + uuid, {recursive: true});

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

export function renderPlayerModel(
    ctx: CanvasRenderingContext2D, {
        SIZE, bbPos, skin, bodyRotation,
        leftArmRotation, leftLegRotation, rightLegRotation, rightArmRotation,
        headRotation, handItem // todo: render hand item
    }
) {
    const side: Record<string, Canvas> = skin[bodyRotation ? 0 : 1];
    const bb = EntityBoundingBoxes[Entities.PLAYER];

    const head = [
        bbPos.x, bbPos.y - (bb.height + 0.21) * SIZE,
        SIZE * 0.5, SIZE * 0.5
    ];

    const armBody = [
        bbPos.x + 0.125 * SIZE, bbPos.y - (bb.height - 0.29) * SIZE,
        SIZE * 0.25, SIZE * 0.75
    ];

    const leg = [
        bbPos.x + 0.125 * SIZE, bbPos.y - (bb.height - 1.04) * SIZE,
        SIZE * 0.25, SIZE * 0.75
    ];

    ctx.save();
    ctx.translate(armBody[0] + armBody[2] / 2, armBody[1]);
    ctx.rotate(leftArmRotation);
    ctx.drawImage(side.back_arm, -armBody[2] / 2, 0, armBody[2], armBody[3]);
    ctx.restore();

    ctx.save();
    ctx.translate(leg[0] + leg[2] / 2, leg[1]);
    ctx.rotate(leftLegRotation);
    ctx.drawImage(side.back_leg, -leg[2] / 2, 0, leg[2], leg[3]);
    ctx.restore();

    ctx.drawImage(side.body, armBody[0], armBody[1], armBody[2], armBody[3]);

    ctx.save();
    ctx.translate(leg[0] + leg[2] / 2, leg[1]);
    ctx.rotate(rightLegRotation);
    ctx.drawImage(side.front_leg, -leg[2] / 2, 0, leg[2], leg[3]);
    ctx.restore();

    // todo: render item

    ctx.save();
    ctx.translate(armBody[0] + armBody[2] / 2, armBody[1]);
    ctx.rotate(rightArmRotation);
    ctx.fillStyle = "white";
    ctx.drawImage(side.front_arm, -armBody[2] / 2, 0, armBody[2], armBody[3]);
    /*if (item) {
        const texture = getItemTexture(item.id, item.meta);
        if (Metadata.toolTypeItems[item.id]) {
            ctx.drawImage(
                bodyRotation ? texture.image : texture.flip(),
                bodyRotation ? -armBody[2] * 0.5 : -armBody[2] * 2.5, 0,
                SIZE * 0.8, SIZE * 0.8
            );
        } else ctx.drawImage(
            texture.image,
            bodyRotation ? 0 : -armBody[2] * 1.5, armBody[3] * 0.8,
            SIZE * 0.4, SIZE * 0.4
        );
    }*/
    ctx.restore();

    ctx.save();
    ctx.translate(head[0] + head[2] / 2, head[1] + head[3] * 0.55);
    ctx.rotate((headRotation + (bodyRotation ? 0 : 180)) * Math.PI / 180);
    ctx.drawImage(side.head, -head[2] / 2, -head[3] / 2, head[2], head[3]);
    head[0] -= 0.015 * SIZE;
    head[1] -= 0.015 * SIZE;
    head[3] = head[2] += 0.03 * SIZE;
    ctx.drawImage(side.head_topping, -head[2] / 2, -head[3] / 2, head[2], head[3]);
    ctx.restore();
}

export function getClientPosition(x: number, y: number) {
    return {
        x: (x - camera.x) * Options.tileSize + canvas.width / 2,
        y: (-y + camera.y) * Options.tileSize + canvas.height / 2
    };
}

export function renderBoundingBox(bb: BoundingBox) {
    const {x, y} = getClientPosition(bb.x, bb.y);
    ctx.strokeRect(x, y, bb.width * Options.tileSize, -bb.height * Options.tileSize);
}

export function drawDotTo(x: number, y: number) {
    const pos = getClientPosition(x, y);
    ctx.fillStyle = "red";
    ctx.fillRect(pos.x - 4, pos.y - 4, 8, 8);
}