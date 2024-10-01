import "../../common/utils/Texture";
import {OriginPlayer} from "./entity/types/OriginPlayer";
import {f2id, f2meta} from "../../common/meta/Items";
import {BoundingBox} from "../../common/entity/BoundingBox";
import {Item} from "../../common/item/Item";
import {CServer} from "./CServer";
import {getServerList, getWorldList, initClientThings, ServerData, URLPrefix, WorldData} from "./Utils";
import {CWorld} from "./world/CWorld";
import {ClientNetwork} from "./ClientNetwork";
import {CAuthPacket} from "../../common/packet/client/CAuthPacket";
import "fancy-printer";
import {CMovementPacket} from "../../common/packet/client/CMovementPacket";
import {CEntity} from "./entity/CEntity";
import {DEFAULT_GRAVITY} from "../../common/entity/Entity";
import {I, IM} from "../../common/meta/ItemIds";
import {CurrentGameProtocol} from "../../common/packet/Packets";
import {CHUNK_LENGTH_BITS, makeZstd, WORLD_HEIGHT} from "../../common/utils/Utils";
import {ZstdInit, ZstdSimple} from "@oneidentity/zstd-js";
import * as BrowserFS from "browserfs";
import {SendMessagePacket} from "../../common/packet/common/SendMessagePacket";

export let canvas: HTMLCanvasElement;
export let chatBox: HTMLDivElement;
export let ctx: CanvasRenderingContext2D;
let f3: HTMLDivElement;
export const TILE_SIZE = 64;

let isFocused = true;

export let clientServer: CServer;

export let clientPlayer: OriginPlayer;

export let clientNetwork: ClientNetwork;

export const camera = {x: 0, y: 0};

export let ServerData: ServerData;
export let WorldData: WorldData;

export let isOnline: boolean;

export function updateCamera() {
    const cameraPan = 1;

    camera.x = clientPlayer.x + (Mouse._xSmooth / innerWidth * 2 - 1) * 45 * cameraPan / TILE_SIZE;
    camera.y = clientPlayer.y + clientPlayer.bb.height - 1 - (Mouse._ySmooth / innerHeight * 2 - 1) * 45 * cameraPan / TILE_SIZE;
    /*
    // camera shake support no one asked for:
    camera.x += Math.sin(Date.now() * 1000) / TILE_SIZE * 6;
    camera.y += Math.sin(Date.now() * 1000) / TILE_SIZE * 6;
    */
}

function onResize() {
    canvas.width = innerWidth + 1;
    canvas.height = innerHeight + 1;
    ctx.imageSmoothingEnabled = false;
    updateMouse();
    updateCamera()
}

export let Keyboard: Record<string, boolean> = {};
export const Mouse = {
    x: 0,
    y: 0,
    rx: 0,
    ry: 0,
    _x: 0,
    _y: 0,
    _xSmooth: 0,
    _ySmooth: 0,
    left: false,
    right: false,
    middle: false
};

export function updateMouse() {
    Mouse.x = (Mouse._x - canvas.width / 2 + camera.x * TILE_SIZE) / TILE_SIZE;
    Mouse.y = (-Mouse._y + canvas.height / 2 + camera.y * TILE_SIZE) / TILE_SIZE;
    Mouse.rx = Math.round(Mouse.x);
    Mouse.ry = Math.round(Mouse.y);
}

let _fps = [];
let lastRender = Date.now() - 1;
let lastUpdate = Date.now() - 1;

export function getClientPosition(x: number, y: number) {
    return {
        x: (x - camera.x) * TILE_SIZE + canvas.width / 2,
        y: (-y + camera.y) * TILE_SIZE + canvas.height / 2
    };
}

export function renderBoundingBox(bb: BoundingBox) {
    const {x: cx, y: cy} = getClientPosition(bb.x, bb.y);
    ctx.strokeRect(cx, cy, bb.width * TILE_SIZE, -bb.height * TILE_SIZE);
}

export function drawDotTo(x: number, y: number) {
    const pos = getClientPosition(x, y);
    ctx.fillStyle = "red";
    ctx.fillRect(pos.x - 4, pos.y - 4, 8, 8);
}

function renderBlock(x: number, y: number) {
    const fullId = clientPlayer.world.getBlockAt(x, y);
    const id = f2id(fullId);
    if (id !== I.AIR) {
        const pos = getClientPosition(x - 0.5, y + 0.5);
        ctx.drawImage(IM[id].getTexture(f2meta(fullId)).image,
            pos.x,
            pos.y,
            TILE_SIZE + 2, TILE_SIZE + 2 // for floating point error
        );
    }
}

function animate() {
    requestAnimationFrame(animate);
    const now = Date.now();
    const dt = ((now - lastRender) || 1) / 1000;
    lastRender = now;
    _fps = _fps.filter(i => i > now - 1000);
    _fps.push(now);
    f3.innerHTML = `FPS: ${Math.floor(_fps.length)}<br>
X: ${clientPlayer.x.toFixed(2)}<br>
Y: ${clientPlayer.y.toFixed(2)}<br>
Vx: ${clientPlayer.vx.toFixed(2)}<br>
Vy: ${clientPlayer.vy.toFixed(2)}`;

    if (document.activeElement !== document.body) {
        Keyboard = {};
    }

    updateMouse();
    updateCamera();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const minX = Math.floor(camera.x - innerWidth / TILE_SIZE / 2);
    const minY = Math.floor(camera.y - innerHeight / TILE_SIZE / 2);
    const maxX = Math.ceil(camera.x + innerWidth / TILE_SIZE / 2);
    const maxY = Math.ceil(camera.y + innerHeight / TILE_SIZE / 2);
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const depth = clientPlayer.world.getBlockDepth(x, y);
            if (depth != 0) renderBlock(x, y);
            if (depth < 3) {
                const pos = getClientPosition(x - 0.5, y + 0.5);
                ctx.save();
                ctx.fillStyle = "black";
                ctx.globalAlpha = [1, 0.8, 0.5][depth];
                ctx.fillRect(pos.x - 1, pos.y - 1, TILE_SIZE + 4, TILE_SIZE + 4);
                ctx.restore();
            }
        }
    }

    const chunkX = clientPlayer.x >> CHUNK_LENGTH_BITS;
    for (let cx = chunkX - 2; cx <= chunkX + 2; cx++) {
        const entities = clientPlayer.world.chunkEntities[cx] ??= [];
        for (const entity of entities) {
            (<CEntity>entity).render(dt);
        }
    }

    const smoothDt = Math.min(dt, 0.015) * 12; // TODO: Add this to settings (The number 12)
    Mouse._xSmooth += (Mouse._x - Mouse._xSmooth) * smoothDt;
    Mouse._ySmooth += (Mouse._y - Mouse._ySmooth) * smoothDt;

    const mouseBlockId = f2id(clientPlayer.world.getBlockAt(Mouse.rx, Mouse.ry));
    if (
        Mouse.ry >= 0 &&
        Mouse.ry < WORLD_HEIGHT &&
        (mouseBlockId !== I.AIR || clientPlayer.world.hasSurroundingBlock(Mouse.rx, Mouse.ry)) &&
        clientPlayer.world.getBlockDepth(Mouse.rx, Mouse.ry) >= 3 &&
        clientPlayer.distance(Mouse.rx, Mouse.ry) <= clientPlayer.blockReach
    ) {
        ctx.strokeStyle = "yellow";
        const blockPos = getClientPosition(Mouse.rx, Mouse.ry);
        ctx.strokeRect(blockPos.x - TILE_SIZE / 2, blockPos.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    }
}

let updateAcc = 0;

function update() {
    if (!isFocused) return;
    const now = Date.now();
    const dt = (now - lastUpdate) / 1000;
    lastUpdate = now;
    updateAcc += dt;

    if (updateAcc <= 1 / 60) return;
    const chunkX = clientPlayer.x >> CHUNK_LENGTH_BITS;
    for (let cx = chunkX - 1; cx <= chunkX + 1; cx++) {
        const entities = clientPlayer.world.chunkEntities[cx] ??= [];
        for (const entity of [...entities]) {
            (<CEntity>entity).update(1 / 60);
        }
    }
    updateAcc %= 1 / 60;

    if (isOnline) {
        clientNetwork.releaseBatch();

        if (
            clientPlayer.world.chunks[clientPlayer.x >> CHUNK_LENGTH_BITS]
            && clientNetwork.handshake
            && clientPlayer.cacheState !== clientPlayer.calcCacheState()
        ) {
            clientPlayer.updateCacheState();
            clientNetwork.sendMovement(
                parseFloat(clientPlayer.x.toFixed(2)),
                parseFloat(clientPlayer.y.toFixed(2)),
                parseFloat(clientPlayer.rotation.toFixed(1))
            );
        }
    }
}

declare global {
    interface Window {
        fsr: any;
        bfs: typeof import("fs");
        Buffer: import("node:buffer");
    }

    const bfs: typeof import("fs");
    const fsr: Record<any, any>;
}

export async function initClient() {
    await ZstdInit();
    Error.stackTraceLimit = 50;
    makeZstd(v => ZstdSimple.compress(v), b => ZstdSimple.decompress(b));
    printer.options.disabledTags.push("debug");

    const hash = location.hash.substring(1);

    if (!hash) location.href = URLPrefix;

    ServerData = getServerList().find(i => i.uuid === hash);
    WorldData = getWorldList().find(i => i.uuid === hash);

    if (!ServerData && !WorldData) location.href = URLPrefix;

    isOnline = !!ServerData;

    /*
    // Client zooming, it works, but no reason to keep it
    let tileSizeShown = TILE_SIZE;
    addEventListener("wheel", e => {
        if (e.deltaY > 0) tileSizeShown *= 0.9;
        else tileSizeShown *= 1.1;
        if (tileSizeShown <= 4) tileSizeShown = 4;
        TILE_SIZE = Math.floor(tileSizeShown);
    });
    */
    addEventListener("resize", onResize);
    addEventListener("keydown", e => {
        if (document.activeElement === document.body) Keyboard[e.key.toLowerCase()] = true;
    });
    addEventListener("keyup", e => Keyboard[e.key.toLowerCase()] = false);
    addEventListener("blur", () => {
        Keyboard = {};
        Mouse.left = false;
        Mouse.right = false;
        Mouse.middle = false;
        isFocused = false;
    });
    addEventListener("focus", () => {
        isFocused = true;
        lastUpdate = Date.now() - 1;
    });
    addEventListener("contextmenu", e => e.preventDefault());
    addEventListener("mousemove", e => {
        Mouse._x = e.pageX;
        Mouse._y = e.pageY;
        updateMouse();
    });
    addEventListener("mousedown", e => {
        if (e.button === 0) Mouse.left = true;
        if (e.button === 1) Mouse.middle = true;
        if (e.button === 2) Mouse.right = true;
    });
    addEventListener("mouseup", e => {
        if (e.button === 0) Mouse.left = false;
        if (e.button === 1) Mouse.middle = false;
        if (e.button === 2) Mouse.right = false;
    });

    initClientThings();

    clientServer = new CServer(WorldData ? WorldData.uuid : "");
    if (isOnline) {
        clientServer.defaultWorld = new CWorld(clientServer, "", "", 0, null, new Set);
    } else {
        window.fsr = {};
        BrowserFS.install(window.fsr);
        await new Promise(r => BrowserFS.configure({fs: "LocalStorage", options: {}}, e => {
            if (e) console.error(e);
            else r();
        }));
        window.bfs = window.fsr.require("fs");
        window.Buffer = window.fsr.require("buffer").Buffer;
        clientServer.init();
    }

    clientPlayer = new OriginPlayer(clientServer.defaultWorld);
    if (isOnline) {
        clientPlayer.gravity = 0;
        clientPlayer.immobile = true;
        clientNetwork = new ClientNetwork;
        const skin = clientPlayer.skin.image;
        const canvas = document.createElement("canvas");
        canvas.width = skin.width;
        canvas.height = skin.height;
        canvas.getContext("2d").drawImage(<any>skin, 0, 0);
        clientNetwork.sendAuth("Steve", canvas.toDataURL());
    } else {
        clientPlayer.init();
        clientPlayer.gravity = DEFAULT_GRAVITY;
        clientPlayer.immobile = false;
        clientPlayer.y = clientPlayer.world.getHighHeight(clientPlayer.x) + 1;
    }

    canvas = <HTMLCanvasElement>document.querySelector("canvas");
    ctx = <CanvasRenderingContext2D>canvas.getContext("2d");
    chatBox = <HTMLDivElement>document.querySelector(".chat-messages");
    const chatInput = <HTMLInputElement>document.querySelector(".chat-input");
    f3 = <HTMLDivElement>document.querySelector(".f3-menu");

    Mouse._x = innerWidth / 2;
    Mouse._y = innerHeight / 2;
    Mouse._xSmooth = Mouse._x;
    Mouse._ySmooth = Mouse._y;

    chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (!chatInput.value) return;
            (isOnline ? clientNetwork : clientPlayer).sendMessage(chatInput.value);
            chatInput.value = "";
        }
    });

    onResize();
    setInterval(update);
    animate();

    setInterval(() => {
        clientPlayer.inventory.add(new Item(I.STONE));
    }, 1000);
}