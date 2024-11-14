import React, {useEffect, useState} from "react";
import {ReactState} from "./Main";
import "./css/client.css";
import {
    Div,
    getClientPosition,
    getServerList,
    getWorldList,
    initClientThings,
    Input,
    Options,
    saveOptions,
    ServerData,
    WorldData
} from "./js/utils/Utils";
// @ts-ignore
import ServerWorker from "./js/worker/SinglePlayerWorker?worker";
import {CServer} from "./js/CServer";
import {ClientNetwork} from "./js/network/ClientNetwork";
import {OriginPlayer} from "./js/entity/types/OriginPlayer";
import {OptionsPopup} from "./components/OptionsPopup";
import {CWorld} from "./js/world/CWorld";
import "fancy-printer";
import InventoryDiv, {animateInventories} from "./components/InventoryDiv";
import {Inventories} from "../common/meta/Inventories";
import {CHUNK_LENGTH, CHUNK_LENGTH_BITS, SUB_CHUNK_AMOUNT, WORLD_HEIGHT} from "../common/utils/Utils";
import {CEntity} from "./js/entity/CEntity";
import {I} from "../common/meta/ItemIds";
import {Packets} from "../common/network/Packets";
import * as BrowserFS from "browserfs";
import Buffer from "buffer";

export const RequiresClientInit = {value: false};

declare global {
    interface Window {
        fsr: any;
        bfs: typeof import("fs");
        Buffer: typeof import("node:buffer");
    }

    const bfs: typeof import("fs");
    const fsr: Record<any, any>;
}

let playerInventoryOn: ReactState<boolean>;
export let clientUUID: ReactState<string>;
let optionPopup: ReactState<boolean>;
let saveScreen: ReactState<boolean>;
export let canvas: HTMLCanvasElement;
export let chatContainer: Div;
export let chatBox: Div;
export let chatInput: Input;
export let ctx: CanvasRenderingContext2D;
export const f3 = {
    fps: null as ReactState<number>,
    x: null as ReactState<number>,
    y: null as ReactState<number>,
    vx: null as ReactState<number>,
    vy: null as ReactState<number>
};

export let clientServer: CServer;
export let singlePlayerWorker: Worker;
export let clientPlayer: OriginPlayer;
export let clientNetwork: ClientNetwork;
export const camera = {x: 0, y: 0};
export let ServerInfo: ServerData;
export let WorldInfo: WorldData;
export let isMultiPlayer: boolean;
export const Keyboard: Record<string, boolean> = {};

export function resetKeyboard() {
    for (const k in Keyboard) delete Keyboard[k];
}

function onResize() {
    canvas.width = innerWidth + 1;
    canvas.height = innerHeight + 1;
    ctx.imageSmoothingEnabled = false;
    updateMouse();
    updateCamera();
}

export function updateCamera() {
    const cameraPan = 1;

    camera.x = clientPlayer.x + (Mouse._xSmooth / innerWidth * 2 - 1) * 45 * cameraPan / Options.tileSize;
    camera.y = clientPlayer.y + clientPlayer.bb.height - 1 - (Mouse._ySmooth / innerHeight * 2 - 1) * 45 * cameraPan / Options.tileSize;
    /*
    // camera shake support no one asked for:
    camera.x += Math.sin(Date.now() * 1000) / TILE_SIZE * 6;
    camera.y += Math.sin(Date.now() * 1000) / TILE_SIZE * 6;
    */
}

const DefaultMouse = {
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

export let Mouse = {...DefaultMouse};

export function updateMouse() {
    if (!canvas) return;
    Mouse.x = (Mouse._x - canvas.width / 2 + camera.x * Options.tileSize) / Options.tileSize;
    Mouse.y = (-Mouse._y + canvas.height / 2 + camera.y * Options.tileSize) / Options.tileSize;
    Mouse.rx = Math.round(Mouse.x);
    Mouse.ry = Math.round(Mouse.y);
}

let intervalId: ReturnType<typeof setTimeout>;
let frameId = 0;
let _fps = [];

function animate() {
    frameId = requestAnimationFrame(animate);

    const now = Date.now();
    const dt = ((now - lastRender) || 1) / 1000;
    lastRender = now;
    _fps = _fps.filter(i => i > now - 1000);
    _fps.push(now);

    // from here to the next part is 0.01ms
    f3.fps[1](Math.floor(_fps.length));
    f3.x[1](+clientPlayer.x.toFixed(2));
    f3.y[1](+clientPlayer.y.toFixed(2));
    f3.vx[1](+clientPlayer.vx.toFixed(2));
    f3.vy[1](+clientPlayer.vy.toFixed(2));

    if (document.activeElement !== document.body) {
        resetKeyboard();
    }

    updateMouse();
    updateCamera();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const minX = Math.floor(camera.x - innerWidth / Options.tileSize / 2);
    const minY = Math.max(0, Math.floor(camera.y - innerHeight / Options.tileSize / 2));
    const maxX = Math.ceil(camera.x + innerWidth / Options.tileSize / 2);
    const maxY = Math.min(WORLD_HEIGHT - 1, Math.ceil(camera.y + innerHeight / Options.tileSize / 2));

    const minSubX = (minX >> CHUNK_LENGTH_BITS) - 1;
    const minSubY = Math.max(0, (minY >> CHUNK_LENGTH_BITS) - 1);
    const maxSubX = (maxX >> CHUNK_LENGTH_BITS) + 1;
    const maxSubY = Math.min(SUB_CHUNK_AMOUNT - 1, (maxY >> CHUNK_LENGTH_BITS) + 1);
    const subLength = Options.tileSize * CHUNK_LENGTH;

    const world = clientPlayer.world as CWorld;

    // 0.1ms
    console.time();
    for (let x = minSubX; x <= maxSubX; x++) {
        for (let y = minSubY; y <= maxSubY; y++) {
            world.renderSubChunk(x, y);
            const render = world.subChunkRenders[x][y];
            const wx = x << CHUNK_LENGTH_BITS;
            const wy = y << CHUNK_LENGTH_BITS;
            const pos = getClientPosition(wx - 0.5, wy - 0.5);
            ctx.drawImage(render.canvas, pos.x, pos.y, subLength + 0.5, -subLength - 0.5);
        }
    }
    console.timeEnd();

    // 0.01ms
    const chunkX = clientPlayer.x >> CHUNK_LENGTH_BITS;
    for (let cx = chunkX - 2; cx <= chunkX + 2; cx++) {
        const entities = world.chunkEntities[cx] ??= [];
        for (const entity of entities) {
            (entity as CEntity).render(ctx, dt);
        }
    }
    clientPlayer.render(ctx, dt);

    // 0.01ms
    const smoothDt = Math.min(dt, 0.015) * Options.cameraSpeed;
    Mouse._xSmooth += (Mouse._x - Mouse._xSmooth) * smoothDt;
    Mouse._ySmooth += (Mouse._y - Mouse._ySmooth) * smoothDt;

    const mouseBlock = clientPlayer.world.getBlock(Mouse.rx, Mouse.ry);
    if (
        Mouse.ry >= 0 &&
        Mouse.ry < WORLD_HEIGHT &&
        (mouseBlock.id !== I.AIR || clientPlayer.world.hasSurroundingBlock(Mouse.rx, Mouse.ry)) &&
        clientPlayer.world.getBlockDepth(Mouse.rx, Mouse.ry) >= 3 &&
        clientPlayer.distance(Mouse.rx, Mouse.ry) <= clientPlayer.blockReach
    ) {
        ctx.save();
        const p = 800;
        ctx.globalAlpha = 1 - Math.abs((Date.now() % p) / p * 2 - 1);
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 2;
        const blockPos = getClientPosition(Mouse.rx, Mouse.ry);
        ctx.strokeRect(blockPos.x - Options.tileSize / 2, blockPos.y - Options.tileSize / 2, Options.tileSize, Options.tileSize);
        ctx.restore();
    }

    animateInventories();
}

function update(dt: number) {
    const chunkX = clientPlayer.x >> CHUNK_LENGTH_BITS;
    for (let cx = chunkX - 1; cx <= chunkX + 1; cx++) {
        const entities = clientPlayer.world.chunkEntities[cx] ??= [];
        for (const entity of [...entities]) {
            entity.update(dt);
        }
    }

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

const chatHistory = [""];
let chatIndex = 0;
let lastRender = Date.now() - 1;

/*
// Client zooming, it works, but no reason to keep it
addEventListener("wheel", e => {
    if (e.deltaY > 0) Options.tileSize *= 0.9;
    else Options.tileSize *= 1.1;
    if (Options.tileSize <= 4) Options.tileSize = 4;
    Options.tileSize = Math.floor(Options.tileSize);
});
*/

function onPressKey(e: KeyboardEvent) {
    if (document.activeElement === document.body && !playerInventoryOn[0]) Keyboard[e.key.toLowerCase()] = true;
    if (e.key === "t" && !hasBlur()) chatInput.focus();
    if (e.key === "Escape") {
        if (document.activeElement === chatInput) chatInput.blur();
        else if (playerInventoryOn[0]) playerInventoryOn[1](false);
        else optionPopup[1](!optionPopup[0]);
    }
    if (e.key === "e" && (!hasBlur() || playerInventoryOn[0])) playerInventoryOn[1](!playerInventoryOn[0]);
}

function onReleaseKey(e: KeyboardEvent) {
    Keyboard[e.key.toLowerCase()] = false;
}

function onLoseFocus() {
    resetKeyboard();
    Mouse.left = false;
    Mouse.right = false;
    Mouse.middle = false;
}

function onFocus() {
}

function onMouseMove(e: MouseEvent) {
    Mouse._x = e.pageX;
    Mouse._y = e.pageY;
    updateMouse();
}

function onCanvasMouseDown(e: MouseEvent) {
    if (e.button === 0) Mouse.left = true;
    if (e.button === 1) Mouse.middle = true;
    if (e.button === 2) Mouse.right = true;
}

function onMouseUp(e: MouseEvent) {
    if (e.button === 0) Mouse.left = false;
    if (e.button === 1) Mouse.middle = false;
    if (e.button === 2) Mouse.right = false;
}

function onChatKeyPress(e: KeyboardEvent) {
    if (e.key === "ArrowUp" || e.key === "KeyUp") {
        if (chatIndex > 0) {
            if (chatIndex === chatHistory.length - 1) {
                chatHistory[chatIndex] = chatInput.value;
            }
            chatIndex--;
            const v = chatInput.value = chatHistory[chatIndex];
            chatInput.setSelectionRange(v.length, v.length);
        }
    } else if (e.key === "ArrowDown" || e.key === "KeyDown") {
        if (chatIndex < chatHistory.length - 1) {
            chatIndex++;
            const v = chatInput.value = chatHistory[chatIndex];
            chatInput.setSelectionRange(v.length, v.length);
        }
    } else if (e.key === "Enter") {
        e.preventDefault();
        if (!chatInput.value) return;
        clientNetwork.sendMessage(chatInput.value);
        chatHistory.splice(chatIndex + 1, chatHistory.length - chatIndex);
        chatHistory[chatIndex] = chatInput.value;
        chatHistory.push("");
        chatIndex++;
        chatInput.value = "";
    }
}

export function saveAndQuit() {
    saveOptions();
    if (!isMultiPlayer) {
        clientNetwork.sendPacket(new Packets.CQuit(null));
        saveScreen[1](true);
    } else {
        clientNetwork.processCQuit();
    }
}

export async function initClient() {
    saveScreen[1](false);
    self.Buffer = Buffer["Buffer"] as any;
    Mouse = {...DefaultMouse};
    resetKeyboard();
    Error.stackTraceLimit = 50;
    chatHistory.length = 0;
    chatHistory.push("");
    chatIndex = 0;
    lastRender = Date.now() - 1;
    ServerInfo = getServerList().find(i => i.uuid === clientUUID[0]);
    WorldInfo = getWorldList().find(i => i.uuid === clientUUID[0]);
    isMultiPlayer = !!ServerInfo;
    ctx = canvas.getContext("2d");

    await initClientThings();

    addEventListener("resize", onResize);
    addEventListener("keydown", onPressKey);
    addEventListener("keyup", onReleaseKey);
    addEventListener("blur", onLoseFocus);
    addEventListener("focus", onFocus);
    addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onCanvasMouseDown);
    addEventListener("mouseup", onMouseUp);
    chatInput.addEventListener("keydown", onChatKeyPress);

    clientServer = new CServer();
    clientServer.defaultWorld = new CWorld(clientServer, "", "", 0, null, new Set);
    clientServer.defaultWorld.ensureSpawnChunks();

    clientPlayer = OriginPlayer.spawn(clientServer.defaultWorld);
    clientPlayer.name = Options.username;

    clientPlayer.gravity = 0;
    clientPlayer.immobile = true;
    clientNetwork = new ClientNetwork;
    if (isMultiPlayer) clientNetwork._connect().then(r => r); // not waiting for it to connect
    else {
        singlePlayerWorker = new ServerWorker();
        singlePlayerWorker.postMessage(WorldInfo.uuid);
        clientNetwork.worker = singlePlayerWorker;
        clientNetwork.sendAuth(true);
        singlePlayerWorker.onmessage = () => {
            singlePlayerWorker.onmessage = e => clientNetwork.processPacketBuffer(e.data);
            clientNetwork.connected = true;
            for (const pk of clientNetwork.immediate) {
                clientNetwork.sendPacket(pk, true);
            }
        };
    }

    Mouse._x = innerWidth / 2;
    Mouse._y = innerHeight / 2;
    Mouse._xSmooth = Mouse._x;
    Mouse._ySmooth = Mouse._y;

    if (!self.bfs) {
        self.fsr = {};
        BrowserFS.install(self.fsr);
        await new Promise(r => BrowserFS.configure({fs: "IndexedDB", options: {}}, e => {
            if (e) console.error(e);
            else r(null);
        }));
        self.bfs = self.fsr.require("fs");
    }

    window["$"] = (x: any) => {
        if (Array.isArray(x)) x = x[0];
        clientNetwork.sendMessage("/" + x);
    };

    onResize();
    intervalId = setInterval(() => update(1 / Options.updatesPerSecond), 1000 / Options.updatesPerSecond);
    frameId = requestAnimationFrame(animate);
}

export function terminateClient() {
    cancelAnimationFrame(frameId);
    clearInterval(intervalId);
    if (clientNetwork && clientNetwork.worker) clientNetwork.worker.terminate();
    removeEventListener("resize", onResize);
    removeEventListener("keydown", onPressKey);
    removeEventListener("keyup", onReleaseKey);
    removeEventListener("blur", onLoseFocus);
    removeEventListener("focus", onFocus);
    removeEventListener("mousemove", onMouseMove);
    if (canvas) canvas.removeEventListener("mousedown", onCanvasMouseDown);
    removeEventListener("mouseup", onMouseUp);
    if (chatInput) chatInput.removeEventListener("keydown", onChatKeyPress);
}

function hasBlur() {
    return playerInventoryOn[0] || saveScreen[0] || optionPopup[0];
}

export function Client(O: {
    clientUUID: ReactState<string>
}) {
    optionPopup = useState(false);
    saveScreen = useState(false);
    playerInventoryOn = useState(false);
    clientUUID = O.clientUUID;

    useEffect(() => {
        if (RequiresClientInit.value) {
            RequiresClientInit.value = false;
            initClient().then(r => r);
        }
    }, []);

    f3.fps = useState(0);
    f3.x = useState(0);
    f3.y = useState(0);
    f3.vx = useState(0);
    f3.vy = useState(0);

    return <>
        <div className="f3-menu">
            FPS: <span className="f3-fps">{f3.fps[0]}</span>
            <br/>
            X:
            <span className="f3-x">{f3.x[0]}</span>
            <br/>
            Y:
            <span className="f3-y">{f3.y[0]}</span>
            <br/>
            VX:
            <span className="f3-vx">{f3.vx[0]}</span>
            <br/>
            VY:
            <span className="f3-vy">{f3.vy[0]}</span>
        </div>
        <canvas id="game" ref={el => canvas = el}></canvas>
        <div className="chat-container" ref={el => chatContainer = el}>
            <div className="chat-messages" ref={el => chatBox = el}>
            </div>
            <input className="chat-input" ref={el => chatInput = el}/>
        </div>
        <div className="background-blur" style={hasBlur() ? {opacity: "1", pointerEvents: "auto"} : {}}></div>

        <InventoryDiv className="hotbar-inventory inventory" inventoryType={Inventories.Hotbar}
                      ikey={"hi"}></InventoryDiv>

        <div className="player-inventory-container" style={playerInventoryOn[0] ? {scale: "1"} : {}}>
            <InventoryDiv className="inv-pp inventory" inventoryType={Inventories.Player} ikey={"pp"}></InventoryDiv>
            <InventoryDiv className="inv-ph inventory" inventoryType={Inventories.Hotbar} ikey={"ph"}></InventoryDiv>
            <InventoryDiv className="inv-pa inventory" inventoryType={Inventories.Armor} ikey={"pa"}></InventoryDiv>
            <InventoryDiv className="inv-pcs inventory" inventoryType={Inventories.CraftingSmall}
                          ikey={"pcs"}></InventoryDiv>
            <InventoryDiv className="inv-pcr inventory" inventoryType={Inventories.CraftingSmallResult}
                          ikey={"pcr"}></InventoryDiv>
        </div>

        <OptionsPopup showSaveAndQuit={true} opt={optionPopup}/>
        <div className="save-screen" style={
            saveScreen[0] ? {
                opacity: "1",
                pointerEvents: "auto"
            } : {}
        }>
            Saving the world...
        </div>
    </>;
}