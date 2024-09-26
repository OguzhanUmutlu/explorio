import "./Client"; // gives error if I don't add this for the Index page
import {Entities, EntityBoundingBoxes, EntityClasses} from "../../common/meta/Entities";
import {CPlayer} from "./entity/types/CPlayer";
import {openDB} from "idb";
import {WorldData} from "./Client";
import {initCommon} from "../../common/utils/Inits";

export type WorldData = { uuid: string, name: string, seed: number, lastPlayedAt: number };
export type ServerData = {
    uuid: string,
    name: string,
    ip: string,
    port: number,
    lastPlayedAt: number,
    preferSecure: boolean
};

export async function getWorldDb() {
    return await openDB("world-" + WorldData.uuid, 3, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("chunks")) {
                db.createObjectStore("chunks");
            }
        }
    });
}

export async function saveChunkDb(index: number, buffer: Uint8Array) {
    const db = await getWorldDb();
    const tx = db.transaction("chunks", "readwrite");
    await tx.objectStore("chunks").put(buffer, index);
    await tx.done;
}

export async function getChunkDb(index: number) {
    const db = await getWorldDb();
    const tx = db.transaction("chunks", "readonly");
    const chunk = await tx.objectStore("chunks").get(index);
    await tx.done;
    return <Uint8Array>chunk;
}

export function initClientThings() {
    initClientEntities();
    initCommon();
}

export function initClientEntities() {
    EntityClasses[Entities.PLAYER] = CPlayer;
}

export function getWSUrls(ip: string, port: number): string[] {
    let isHttps = ip.startsWith("https://");
    let isHttp = ip.startsWith("http://");
    let url = ip;
    if (isHttps) url = url.substring(8);
    else if (isHttp) url = url.substring(7);

    const spl = Math.min(url.indexOf("/"), url.indexOf("#"), url.indexOf("?"));
    url = spl === -1 ? `${url}:${port}` : `${url.substring(0, spl)}:${port}${url.substring(spl)}`;
    if (isHttp || isHttps) return [`${isHttps ? "wss://" : "ws://"}${url}`];
    return [`wss://${url}`, `ws://${url}`];
}

export function getWorldList(): WorldData[] {
    return JSON.parse(localStorage.getItem("explorio.worlds") || "[]");
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

export function removeWorld(index: number) {
    const worlds = getWorldList();
    worlds.splice(index, 1);
    localStorage.setItem("explorio.worlds", JSON.stringify(worlds));
}

export function getServerList(): ServerData[] {
    return JSON.parse(localStorage.getItem("explorio.servers") || "[]");
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

export function removeServer(index: number) {
    const servers = getServerList();
    servers.splice(index, 1);
    localStorage.setItem("explorio.servers", JSON.stringify(servers));
}

export function pingServer(ip: string, port: number): Promise<string> {
    return fetch(`http://${ip}:${port}/ws-ping`).then(res => res.statusText);
}

export function renderPlayerModel(
    ctx, {
        SIZE, bbPos, skin, bodyRotation,
        leftArmRotation, leftLegRotation, rightLegRotation, rightArmRotation,
        headRotation, handItem
    }
) {
    /*** @type {Record<string, HTMLCanvasElement>} */
    const side = skin[bodyRotation ? 0 : 1];
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

    ctx.drawImage(side.body, ...armBody);

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