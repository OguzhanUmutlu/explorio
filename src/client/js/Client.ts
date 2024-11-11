import "../../common/utils/Texture";
import {OriginPlayer} from "./entity/types/OriginPlayer";
import {BoundingBox} from "../../common/entity/BoundingBox";
import {Item} from "../../common/item/Item";
import {CServer} from "./CServer";
import {
    Div,
    getServerList,
    getWorldList,
    initClientThings,
    Input,
    Options,
    saveOptions,
    ServerData,
    URLPrefix,
    WorldData
} from "./utils/Utils.js";
import {CWorld} from "./world/CWorld";
import {ClientNetwork} from "./network/ClientNetwork.js";
import "fancy-printer";
import {CEntity} from "./entity/CEntity";
import {I} from "../../common/meta/ItemIds";
import {CHUNK_LENGTH, CHUNK_LENGTH_BITS, SUB_CHUNK_AMOUNT, WORLD_HEIGHT} from "../../common/utils/Utils";
import OptionsContainer from "../components/OptionsContainer";
// noinspection TypeScriptCheckImport
import ServerWorker from "./worker/SinglePlayerWorker.js?worker";
import * as BrowserFS from "browserfs";
import {Packets} from "../../common/network/Packets.js";
import {
    animateContainers,
    ContainerToggler,
    getInventoryHandler,
    initContainerDivs
} from "./utils/ContainerRenderer.js";

export let canvas: HTMLCanvasElement;
export let chatContainer: Div;
export let chatBox: Div;
export let chatInput: Input;
export let ctx: CanvasRenderingContext2D;
export const f3 = {
    fps: <HTMLSpanElement>null,
    x: <HTMLSpanElement>null,
    y: <HTMLSpanElement>null,
    vx: <HTMLSpanElement>null,
    vy: <HTMLSpanElement>null
};
export const UpdatesPerSecond = 60;
export const ChatLimit = 100;

let isFocused = true;

export let clientServer: CServer;
export let singlePlayerWorker: Worker;

export let clientPlayer: OriginPlayer;

export let clientNetwork: ClientNetwork;

export const camera = {x: 0, y: 0};

export let ServerData: ServerData;
export let WorldData: WorldData;

export let isMultiPlayer: boolean;

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

function onResize() {
    canvas.width = innerWidth + 1;
    canvas.height = innerHeight + 1;
    ctx.imageSmoothingEnabled = false;
    updateMouse();
    updateCamera();
}

export const Keyboard: Record<string, boolean> = {};

export function resetKeyboard() {
    for (const k in Keyboard) delete Keyboard[k];
}

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
    if (!canvas) return;
    Mouse.x = (Mouse._x - canvas.width / 2 + camera.x * Options.tileSize) / Options.tileSize;
    Mouse.y = (-Mouse._y + canvas.height / 2 + camera.y * Options.tileSize) / Options.tileSize;
    Mouse.rx = Math.round(Mouse.x);
    Mouse.ry = Math.round(Mouse.y);
}

let _fps = [];
let lastRender = Date.now() - 1;
let lastUpdate = Date.now() - 1;

export function getClientPosition(x: number, y: number) {
    return {
        x: (x - camera.x) * Options.tileSize + canvas.width / 2,
        y: (-y + camera.y) * Options.tileSize + canvas.height / 2
    };
}

export function renderBoundingBox(bb: BoundingBox) {
    const {x: cx, y: cy} = getClientPosition(bb.x, bb.y);
    ctx.strokeRect(cx, cy, bb.width * Options.tileSize, -bb.height * Options.tileSize);
}

export function drawDotTo(x: number, y: number) {
    const pos = getClientPosition(x, y);
    ctx.fillStyle = "red";
    ctx.fillRect(pos.x - 4, pos.y - 4, 8, 8);
}

function animate() {
    requestAnimationFrame(animate);
    const now = Date.now();
    const dt = ((now - lastRender) || 1) / 1000;
    lastRender = now;
    _fps = _fps.filter(i => i > now - 1000);
    _fps.push(now);

    // this part is 0.09ms, the slowest part of the render
    f3.fps.innerText = Math.floor(_fps.length).toString();
    f3.x.innerText = clientPlayer.x.toFixed(2);
    f3.y.innerText = clientPlayer.y.toFixed(2);
    f3.vx.innerText = clientPlayer.vx.toFixed(2);
    f3.vy.innerText = clientPlayer.vy.toFixed(2);

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

    const world = <CWorld>clientPlayer.world;

    // 0.06ms for 1 render, yes this is javascript, not C, somehow
    for (let x = minSubX; x <= maxSubX; x++) {
        for (let y = minSubY; y <= maxSubY; y++) {
            world.renderSubChunk(x, y);
            const cnv = world.renderedSubChunks[x][y];
            const wx = x << CHUNK_LENGTH_BITS;
            const wy = y << CHUNK_LENGTH_BITS;
            const pos = getClientPosition(wx - 0.5, wy - 0.5);
            ctx.drawImage(<any>cnv, pos.x, pos.y, subLength + 0.5, -subLength - 0.5);
        }
    }

    const chunkX = clientPlayer.x >> CHUNK_LENGTH_BITS;
    for (let cx = chunkX - 2; cx <= chunkX + 2; cx++) {
        const entities = world.chunkEntities[cx] ??= [];
        for (const entity of entities) {
            (<CEntity>entity).render(dt);
        }
    }
    clientPlayer.render(dt);

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

    animateContainers();
}

let updateAcc = 0;

function update() {
    // if (!isFocused) return;
    const now = Date.now();
    const dt = (now - lastUpdate) / 1000;
    lastUpdate = now;
    updateAcc += dt;

    if (updateAcc <= 1 / UpdatesPerSecond) return;

    const chunkX = clientPlayer.x >> CHUNK_LENGTH_BITS;
    for (let cx = chunkX - 1; cx <= chunkX + 1; cx++) {
        const entities = clientPlayer.world.chunkEntities[cx] ??= [];
        for (const entity of [...entities]) {
            entity.update(1 / UpdatesPerSecond);
        }
    }
    updateAcc %= 1 / UpdatesPerSecond;

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
    Error.stackTraceLimit = 50;

    const hash = location.hash.substring(1);

    if (!hash) location.href = URLPrefix;

    ServerData = getServerList().find(i => i.uuid === hash);
    WorldData = getWorldList().find(i => i.uuid === hash);

    if (!ServerData && !WorldData) location.href = URLPrefix;

    isMultiPlayer = !!ServerData;

    const chatHistory = [""];
    let chatIndex = 0;

    const InventoryHandler = getInventoryHandler();

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
        if (document.activeElement === document.body && !ContainerToggler.isBlurOn()) Keyboard[e.key.toLowerCase()] = true;
        if (e.key === "t") chatInput.focus();
        if (e.key === "Escape") {
            if (document.activeElement === chatInput) chatInput.blur();
            else if (ContainerToggler.isBlurOn()) ContainerToggler.closeAll();
            else optionsContainer.toggle();
        }
        if (e.key === "e") getInventoryHandler().toggle();
    });
    addEventListener("keyup", e => Keyboard[e.key.toLowerCase()] = false);
    addEventListener("blur", () => {
        resetKeyboard();
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
    canvas = <HTMLCanvasElement>document.getElementById("game");
    addEventListener("mousemove", e => {
        Mouse._x = e.pageX;
        Mouse._y = e.pageY;
        updateMouse();
    });
    canvas.addEventListener("mousedown", e => {
        if (e.button === 0) Mouse.left = true;
        if (e.button === 1) Mouse.middle = true;
        if (e.button === 2) Mouse.right = true;
    });
    addEventListener("mouseup", e => {
        if (e.button === 0) Mouse.left = false;
        if (e.button === 1) Mouse.middle = false;
        if (e.button === 2) Mouse.right = false;
    });

    await initClientThings();

    const optionsContainer = await OptionsContainer();

    const saveAndQuit = <Div>document.querySelector(".save-and-quit");

    saveAndQuit.hidden = false;

    saveAndQuit.addEventListener("click", () => {
        saveOptions();
        if (!isMultiPlayer) {
            clientNetwork.sendPacket(new Packets.CQuit(null));
            const saveScreen = <Div>document.querySelector(".save-screen");
            saveScreen.style.opacity = "1";
            saveScreen.style.pointerEvents = "auto";
        } else {
            location.href = URLPrefix;
        }
    });

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
        singlePlayerWorker.postMessage(WorldData.uuid);
        clientNetwork.worker = singlePlayerWorker;
        await clientNetwork.sendAuth(true);
        singlePlayerWorker.onmessage = () => {
            singlePlayerWorker.onmessage = e => clientNetwork.processPacketBuffer(e.data);
            clientNetwork.connected = true;
            for (const pk of clientNetwork.immediate) {
                clientNetwork.sendPacket(pk, true);
            }
        };
    }

    ctx = <CanvasRenderingContext2D>canvas.getContext("2d");
    chatBox = <Div>document.querySelector(".chat-messages");
    chatContainer = <Div>document.querySelector(".chat-container");
    chatInput = <Input>document.querySelector(".chat-input");

    for (const k in f3) {
        f3[k] = <HTMLSpanElement>document.querySelector(`.f3-${k}`);
    }

    Mouse._x = innerWidth / 2;
    Mouse._y = innerHeight / 2;
    Mouse._xSmooth = Mouse._x;
    Mouse._ySmooth = Mouse._y;

    chatInput.addEventListener("keydown", e => {
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
    });

    onResize();
    setInterval(update);
    initContainerDivs();
    animate();

    self.fsr = {};
    BrowserFS.install(self.fsr);
    await new Promise(r => BrowserFS.configure({fs: "IndexedDB", options: {}}, e => {
        if (e) console.error(e);
        else r();
    }));
    self.bfs = self.fsr.require("fs");

    window["$"] = x => {
        if (Array.isArray(x)) x = x[0];
        clientNetwork.sendMessage("/" + x);
    };

    setInterval(() => {
        clientPlayer.addItem(new Item(I.STONE));
        clientPlayer.armor.add(new Item(I.STONE));
        clientPlayer.craftingSmall.add(new Item(I.STONE));
        clientPlayer.craftingSmallResult.add(new Item(I.STONE));
    }, 10);
}