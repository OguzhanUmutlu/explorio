import React, {useEffect, useState} from "react";
import "./css/client.css";
import {
    Div,
    getClientPosition,
    getServerList,
    getWorldList,
    Input,
    isMobileByAgent,
    Options,
    ReactState,
    renderBoundingBox,
    saveOptions,
    ServerData,
    WorldData
} from "@c/utils/Utils";
import CServer from "@c/CServer";
import ClientNetwork from "@c/network/ClientNetwork";
import OriginPlayer from "@c/entity/types/OriginPlayer";
import {OptionsPopup} from "@dom/components/OptionsPopup";
import CWorld from "@c/world/CWorld";
import "fancy-printer";
import InventoryDiv, {animateInventories} from "@dom/components/InventoryDiv";
import {Inventories, InventorySizes} from "@/meta/Inventories";
import {BM, I} from "@/meta/ItemIds";
import Server, {DefaultServerConfig} from "@/Server";
import PlayerNetwork from "@/network/PlayerNetwork";
import ParticleManager from "@c/particle/ParticleManager";
import Packet from "@/network/Packet";
import {ChunkLength, ChunkLengthBits, SubChunkAmount, WorldHeight} from "@/meta/WorldConstants";
import {im2f} from "@/meta/Items";
import {rotateMeta} from "@/utils/Utils";

declare global {
    interface Window {
        bfs: typeof import("fs");
    }

    const bfs: typeof import("fs");
}

let playerInventoryOn: ReactState<boolean>;
let chatContainer: ReactState<boolean>;
export let clientUUID: ReactState<string>;
let optionPopup: ReactState<boolean>;
let saveScreen: ReactState<boolean>;
export let canvas: HTMLCanvasElement;
export let chatBox: Div;
export let chatInput: Input;
export let ctx: CanvasRenderingContext2D;
export let f3On: ReactState<boolean>;
export const f3 = {
    fps: null as ReactState<number>,
    x: null as ReactState<number>,
    y: null as ReactState<number>,
    vx: null as ReactState<number>,
    vy: null as ReactState<number>
};
export let handIndexState: ReactState<number>;

export let clientServer: CServer;
export let singlePlayerServer: Server;
export let clientPlayer: OriginPlayer;
export let clientNetwork: ClientNetwork;
export const camera = {x: 0, y: 0};
export let ServerInfo: ServerData;
export let WorldInfo: WorldData;
export let isMultiPlayer: boolean;
export const Keyboard: Record<string, boolean> = {};
export let particleManager: ParticleManager;
export let renderCollisionBoxes = false;
export let showChunkBorders = false;
let cameraZoomMultiplier = 1;
let cameraZoom = 1;
let cameraZoomRender = 1;

export function resetKeyboard() {
    for (const k in Keyboard) delete Keyboard[k];
}

function updateTileSize() {
    Options.tileSize = Math.round(innerWidth / 21) * cameraZoomRender;
}

function onResize() {
    updateTileSize();
    Mouse._x = Mouse._px * innerWidth;
    Mouse._y = Mouse._py * innerHeight;
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
    _px: 0,
    _py: 0,
    _xSmooth: 0,
    _ySmooth: 0,
    left: false,
    right: false,
    middle: false,
    rotation: 0
};

export let Mouse = {...DefaultMouse};

export function updateMouse() {
    if (!canvas) return;
    Mouse.x = (Mouse._x - canvas.width / 2 + camera.x * Options.tileSize) / Options.tileSize;
    Mouse.y = (-Mouse._y + canvas.height / 2 + camera.y * Options.tileSize) / Options.tileSize;
    Mouse.rx = Math.round(Mouse.x);
    Mouse.ry = Math.round(Mouse.y);
    const mdx = Mouse.x - Mouse.rx;
    const mdy = Mouse.y - Mouse.ry;
    Mouse.rotation = (mdx > 0 ? (mdy > 0 ? 3 : 0) : (mdy > 0 ? 2 : 1));
}

let intervalId: ReturnType<typeof setTimeout>;
let frameId = 0;
let _fps = [];

function animate() {
    frameId = requestAnimationFrame(animate);

    if (!chatBox || !canvas) return;

    if (!chatContainer[0] && chatBox.scrollTop !== chatBox.scrollHeight) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    const now = Date.now();
    const dt = ((now - lastRender) || 1) / 1000;
    lastRender = now;
    _fps = _fps.filter(i => i > now - 1000);
    _fps.push(now);

    cameraZoomRender += (cameraZoom - cameraZoomRender) * 0.1;

    cameraZoom = Keyboard.shift ? 0.9 : 1;
    cameraZoom *= cameraZoomMultiplier;

    updateTileSize();

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
    const maxY = Math.min(WorldHeight - 1, Math.ceil(camera.y + innerHeight / Options.tileSize / 2));

    const minSubX = (minX >> ChunkLengthBits) - 1;
    const minSubY = Math.max(0, (minY >> ChunkLengthBits) - 1);
    const maxSubX = (maxX >> ChunkLengthBits) + 1;
    const maxSubY = Math.min(SubChunkAmount - 1, (maxY >> ChunkLengthBits) + 1);
    const subLength = Options.tileSize * ChunkLength;

    const world = clientPlayer.world as CWorld;

    for (let chunkX = minSubX; chunkX <= maxSubX; chunkX++) {
        for (let chunkY = minSubY; chunkY <= maxSubY; chunkY++) {
            world.renderSubChunk(chunkX, chunkY);
            const render = world.subChunkRenders[chunkX][chunkY];
            const x = chunkX << ChunkLengthBits;
            const y = chunkY << ChunkLengthBits;
            const pos = getClientPosition(x - 0.5, y - 0.5);
            ctx.drawImage(render.bCanvas, pos.x, pos.y, subLength + 0.5, -subLength - 0.5);
            ctx.drawImage(render.sCanvas, pos.x, pos.y, subLength + 0.5, -subLength - 0.5);
        }
    }

    if (showChunkBorders) {
        for (let chunkX = minSubX; chunkX <= maxSubX; chunkX++) {
            for (let chunkY = minSubY; chunkY <= maxSubY; chunkY++) {
                const x = chunkX << ChunkLengthBits;
                const y = chunkY << ChunkLengthBits;
                const pos = getClientPosition(x - 0.5, y - 0.5);
                ctx.strokeStyle = "#ff0000";
                ctx.strokeRect(pos.x, pos.y, subLength + 0.5, -subLength - 0.5);
                ctx.strokeStyle = "#00ff00";
                ctx.strokeRect(pos.x + Options.tileSize / 2, pos.y - Options.tileSize / 2, subLength + 0.5, -subLength - 0.5);
            }
        }
    }

    particleManager.render(ctx, dt);

    const chunkXMiddle = clientPlayer.x >> ChunkLengthBits;
    for (let chunkX = chunkXMiddle - 2; chunkX <= chunkXMiddle + 2; chunkX++) {
        const entities = world.chunkEntities[chunkX] ??= new Set;
        for (const entity of entities) {
            entity.render(ctx, dt);

            if (renderCollisionBoxes) {
                ctx.strokeStyle = "#ffffff";
                renderBoundingBox(entity.bb);
                ctx.strokeStyle = "#ff0000";
                renderBoundingBox(entity.groundBB);
            }
        }
    }

    const smoothDt = Math.min(dt, 0.015) * Options.cameraSpeed;
    Mouse._xSmooth += (Mouse._x - Mouse._xSmooth) * smoothDt;
    Mouse._ySmooth += (Mouse._y - Mouse._ySmooth) * smoothDt;

    const mouseBlock = world.getBlock(Mouse.rx, Mouse.ry);
    const item = clientPlayer.handItem;
    if (
        Mouse.ry >= 0
        && Mouse.ry < WorldHeight
        && (mouseBlock.id !== I.AIR || world.hasSurroundingBlock(Mouse.rx, Mouse.ry))
        && world.getBlockDepth(Mouse.rx, Mouse.ry) >= 3
        && clientPlayer.distance(Mouse.rx, Mouse.ry) <= clientPlayer.blockReach
        && (clientPlayer.canBreakBlock() || (item && item.toMetadata().isBlock))
    ) {
        ctx.save();
        const p = 1200;
        ctx.globalAlpha = (1 - 2 / p * Math.abs((Date.now() % p) - p / 2)) * 0.3 + 0.2;
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        const blockPos = getClientPosition(Mouse.rx, Mouse.ry);
        if (item) {
            const block = BM[im2f(item.id, rotateMeta(item.id, item.meta, Mouse.rotation))];
            if (block && clientPlayer.canPlaceBlock()) {
                block.render(ctx, blockPos.x - Options.tileSize / 2, blockPos.y - Options.tileSize / 2, Options.tileSize, Options.tileSize, false);
            }
        }
        ctx.strokeRect(blockPos.x - Options.tileSize / 2, blockPos.y - Options.tileSize / 2, Options.tileSize, Options.tileSize);
        ctx.restore();
    }

    animateInventories();

    if (handIndexState[0] !== clientPlayer.handIndex) {
        handIndexState[1](clientPlayer.handIndex);
    }
}

function update(dt: number) {
    if (singlePlayerServer && singlePlayerServer.pausedUpdates) return;
    const world = clientPlayer.world;

    const chunkXMiddle = clientPlayer.x >> ChunkLengthBits;
    for (let chunkX = chunkXMiddle - 1; chunkX <= chunkXMiddle + 1; chunkX++) {
        const entities = Array.from(world.chunkEntities[chunkX] ??= new Set);
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            entity.update(dt);
        }
    }

    clientNetwork.releaseBatch();

    if (
        world.chunks[clientPlayer.x >> ChunkLengthBits]
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

function onWheel(e: WheelEvent) {
    if (e.altKey) {
        if (e.deltaY > 0) cameraZoomMultiplier *= 0.9;
        else cameraZoomMultiplier *= 1.1;
        cameraZoomMultiplier = Math.max(0.5, Math.min(10, cameraZoomMultiplier));
        e.preventDefault();
    } else if (!isAnyUIOpen()) {
        clientNetwork.sendHandIndex((clientPlayer.handIndex + (e.deltaY > 0 ? 1 : -1) + InventorySizes.hotbar) % InventorySizes.hotbar);
    }
}

// Whether any F3 sub-shortcut has been executed
let executedF3 = false;

function onPressKey(e: KeyboardEvent) {
    if (isAnyUIOpen()) {
        if (!isInChat() && e.key === "e") {
            playerInventoryOn[1](false); // todo: every inventory should be set to false here.
            clientNetwork.sendCloseInventory();
        }

        if (e.key === "Escape") {
            closeChat();

            if (playerInventoryOn[0]) {
                clientNetwork.sendCloseInventory();
            }

            playerInventoryOn[1](false);
            optionPopup[1](false);
        }
    } else {
        Keyboard[e.key.toLowerCase()] = true;

        if (e.key === "t") {
            openChat();
            e.preventDefault();
        }

        if (e.key === "e") {
            playerInventoryOn[1](true);
            clientNetwork.sendOpenInventory();
        }

        if (e.key === "Escape") {
            optionPopup[1](true);
        }

        if (e.key === "F3") {
            executedF3 = false;
            e.preventDefault();
        }

        if (!isNaN(parseInt(e.key)) && e.key !== "0") {
            clientNetwork.sendHandIndex(parseInt(e.key) - 1);
        }

        if (e.key === "q") {
            const handItem = clientPlayer.handItem;
            if (handItem) {
                clientPlayer.inventories.hotbar.decreaseItemAt(clientPlayer.handIndex);
                clientNetwork.sendDropItem("hotbar", clientPlayer.handIndex, 1);
            }
        }
    }
}

let lastSpace = 0;

function onReleaseKey(e: KeyboardEvent) {
    Keyboard[e.key.toLowerCase()] = false;

    if (e.key === " ") {
        if (Date.now() - lastSpace <= 250 && clientPlayer.canToggleFly) {
            clientNetwork.sendToggleFlight();
        }
        lastSpace = Date.now();
    }

    if (!isAnyUIOpen()) {
        if (e.key === "F3") {
            if (Keyboard.b) renderCollisionBoxes = !renderCollisionBoxes;
            else if (!executedF3) f3On[1](!f3On[0]);
        } else if (e.key === "b") {
            if (Keyboard.f3) {
                renderCollisionBoxes = !renderCollisionBoxes;
                executedF3 = true;
            }
        } else if (e.key === "g") {
            if (Keyboard.f3) {
                showChunkBorders = !showChunkBorders;
                executedF3 = true;
            }
        }
    }
}

function onLoseFocus() {
    resetKeyboard();
    Mouse.left = false;
    Mouse.right = false;
    Mouse.middle = false;
    if (Options.pauseOnBlur) optionPopup[1](true);
}

function onFocus() {
}

function onCanvasMouseMove(e: MouseEvent) {
    handleMouseMovement(e.pageX, e.pageY);
}

let startTouchX = 0;
let startTouchY = 0;
let movedTouchOut = false;
let touchDown = 0;

function handleTouch(t: Touch) {
    handleMouseMovement(t.pageX, t.pageY);
}

function onCanvasTouchStart(e: TouchEvent) {
    handleTouch(e.touches[0]);
    startTouchX = Mouse.rx;
    startTouchY = Mouse.ry;
    movedTouchOut = false;
    touchDown++;
    Mouse.left = true;
}

function onCanvasTouchMove(e: TouchEvent) {
    handleTouch(e.touches[0]);
    if (startTouchX !== Mouse.rx || startTouchY !== Mouse.ry) movedTouchOut = true;
}

function onTouchEnd() {
    const broke = clientPlayer.justBreaking;
    if (!movedTouchOut && (!broke || broke[0] !== Mouse.rx || broke[1] !== Mouse.ry)) {
        // click! place!
        clientPlayer.placeIfCan();
    }
    clientPlayer.justBreaking = null;
    touchDown--;
    if (touchDown === 0) Mouse.left = false;
}

function handleMouseMovement(x: number, y: number) {
    Mouse._x = x;
    Mouse._y = y;
    Mouse._px = x / innerWidth;
    Mouse._py = y / innerHeight;
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

export function initClient() {
    saveScreen[1](false);
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
    const isMobile = isMobileByAgent();

    addEventListener("resize", onResize);
    addEventListener("keydown", onPressKey);
    addEventListener("keyup", onReleaseKey);
    addEventListener("blur", onLoseFocus);
    addEventListener("focus", onFocus);
    addEventListener("wheel", onWheel);
    canvas.addEventListener("mousemove", onCanvasMouseMove);
    canvas.addEventListener("touchstart", onCanvasTouchStart);
    canvas.addEventListener("touchmove", onCanvasTouchMove);
    addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("mousedown", onCanvasMouseDown);
    addEventListener("mouseup", onMouseUp);
    chatInput.addEventListener("keydown", onChatKeyPress);
    addEventListener("beforeunload", terminateClient);

    particleManager = new ParticleManager;

    clientServer = new CServer();
    clientServer.config = DefaultServerConfig;
    clientServer.defaultWorld = new CWorld(clientServer, "", "", 0, null, new Set);
    clientServer.defaultWorld.ensureSpawnChunks();

    const req = {socket: {remoteAddress: "::ffff:127.0.0.1"}};

    clientPlayer = OriginPlayer.spawn(clientServer.defaultWorld);
    clientPlayer.name = Options.username;

    clientPlayer.immobile = true;
    clientNetwork = new ClientNetwork;
    if (isMultiPlayer) clientNetwork._connect().then(r => r); // not waiting for it to connect
    else {
        singlePlayerServer = new Server(bfs, `singleplayer/${WorldInfo.uuid}`);
        Error.stackTraceLimit = 50;

        if (!singlePlayerServer.fileExists("singleplayer")) singlePlayerServer.createDirectory("singleplayer");
        singlePlayerServer.config = DefaultServerConfig;

        singlePlayerServer.init();

        const serverNetwork = new PlayerNetwork({
            send(data: Buffer) {
                clientNetwork.processPacketBuffer(data);
            },
            kick() {
                printer.warn("Got kicked for some reason? did you kick yourself?");
            },
            close() {
                printer.warn("Pseudo-closed the pseudo-socket. What a duo...");
                serverNetwork.onClose();
            }
        }, req);

        clientNetwork.connected = true;
        clientNetwork.worker = {
            postMessage: (e: Buffer) => serverNetwork.processPacketBuffer(e),
            terminate: () => null
        };
        clientNetwork.sendPacket = (pk: Packet) => serverNetwork.processPacketBuffer(pk.serialize());

        clientNetwork.sendAuth(true);

        serverNetwork.player.permissions.add("*");
    }

    Mouse._x = innerWidth / 2;
    Mouse._y = innerHeight / 2;
    Mouse._px = 0.5;
    Mouse._py = 0.5;
    Mouse._xSmooth = Mouse._x;
    Mouse._ySmooth = Mouse._y;

    window["$"] = (x: string | [string]) => {
        if (Array.isArray(x)) x = x[0];
        clientNetwork.sendMessage("/" + x);
    };

    if (isMobile) {
        closeChat();
    }

    onResize();
    intervalId = setInterval(() => update(1 / Options.updatesPerSecond), 1000 / Options.updatesPerSecond);
    frameId = requestAnimationFrame(animate);
}

export function terminateClient() {
    saveOptions();
    cancelAnimationFrame(frameId);
    clearInterval(intervalId);
    if (clientNetwork && clientNetwork.worker) {
        clientNetwork.worker.terminate();
        clientNetwork.worker = null;
    }
    if (singlePlayerServer) singlePlayerServer.close();
    removeEventListener("resize", onResize);
    removeEventListener("keydown", onPressKey);
    removeEventListener("keyup", onReleaseKey);
    removeEventListener("blur", onLoseFocus);
    removeEventListener("focus", onFocus);
    removeEventListener("wheel", onWheel);
    if (canvas) {
        canvas.removeEventListener("mousemove", onCanvasMouseMove);
        canvas.removeEventListener("mousedown", onCanvasMouseDown);
        canvas.removeEventListener("touchstart", onCanvasTouchMove);
        canvas.removeEventListener("touchmove", onCanvasTouchMove);
    }
    removeEventListener("touchend", onTouchEnd);
    removeEventListener("mouseup", onMouseUp);
    if (chatInput) {
        chatInput.removeEventListener("keydown", onChatKeyPress);
    }
    removeEventListener("beforeunload", terminateClient);
    singlePlayerServer = null;
    console.clear();
}

// todo: add fall damage
// todo: add crafting api
// todo: fix non-rendering chunks in clients, i think this bug disappeared a few commits ago, question mark (?)
// todo: custom tree lengths and shapes like jungle etc.
// todo: i think only trees of meta 0 1 2 3 are being chosen
// todo: render hand item
// todo: add crafting table ui
// todo: handle tool logic
// todo: calculate light levels when chunks load. when placed/broken a block check the 15 radius
// todo: /give command

function isInChat() {
    return chatContainer[0];
}

function closeChat() {
    chatContainer[1](false);
    chatInput.blur();
}

function openChat() {
    chatContainer[1](true);
    requestAnimationFrame(() => chatInput.focus());
}

function toggleChat() {
    if (isInChat()) closeChat();
    else openChat();
}

function isAnyUIOpen() {
    return playerInventoryOn[0] || saveScreen[0] || optionPopup[0] || isInChat();
}

function hasBlur() {
    return playerInventoryOn[0] || saveScreen[0] || optionPopup[0];
}

export function Client(O: {
    clientUUID: ReactState<string>,
    favicon: ReactState<string>
}) {
    optionPopup = useState(false);
    saveScreen = useState(false);
    playerInventoryOn = useState(false);
    chatContainer = useState(false);
    handIndexState = useState(0);
    clientUUID = O.clientUUID;
    f3On = useState(false);
    const mouseX = useState(0);
    const mouseY = useState(0);
    if (singlePlayerServer) singlePlayerServer.pausedUpdates = optionPopup[0];

    useEffect(() => {
        function onMouseMove(e: MouseEvent) {
            mouseX[1](e.pageX);
            mouseY[1](e.pageY);
        }

        initClient();

        addEventListener("mousemove", onMouseMove);

        return () => {
            terminateClient();
            removeEventListener("mousemove", onMouseMove);
        };
    }, []);


    f3.fps = useState(0);
    f3.x = useState(0);
    f3.y = useState(0);
    f3.vx = useState(0);
    f3.vy = useState(0);
    const isMobile = isMobileByAgent();

    return <>
        {/* F3 Menu */}
        {f3On[0] ? <div className="f3-menu">
            FPS: <span className="f3-fps">{f3.fps[0]}</span><br/>
            X: <span className="f3-x">{f3.x[0]}</span><br/>
            Y: <span className="f3-y">{f3.y[0]}</span><br/>
            VX: <span className="f3-vx">{f3.vx[0]}</span><br/>
            VY: <span className="f3-vy">{f3.vy[0]}</span>
        </div> : <></>}


        {/* The game's canvas */}
        <canvas id="game" ref={el => canvas = el}></canvas>


        {/* Chat Container */}
        <div className={chatContainer[0] ? "full-chat-container" : "chat-container"}>
            <div className="chat-messages" ref={el => chatBox = el}>
            </div>
            <input className="chat-input" ref={el => chatInput = el}/>
        </div>


        {/* Mobile Chat Toggle Button */}
        <div className="mobile-chat-toggle"
             style={isMobile && !hasBlur() ? {} : {scale: "0"}}
             onClick={() => toggleChat()}></div>


        {/* Mobile Options Button */}
        <div className="mobile-options-open" style={isMobile && !hasBlur() ? {} : {scale: "0"}}
             onClick={() => {
                 closeChat();
                 optionPopup[1](true);
             }}>
            {/* These are three dots. */}
            <div></div>
            <div></div>
            <div></div>
        </div>


        {/* Background Blur used in UIs */}
        <div className="background-blur" style={hasBlur() ? {opacity: "1", pointerEvents: "auto"} : {}}
             onClick={() => {
                 const cursorItem = clientPlayer.cursorItem;
                 if (playerInventoryOn[0] && cursorItem) {
                     const count = clientPlayer.cursorItem.count;
                     clientPlayer.cursorItem = null;
                     clientNetwork.sendDropItem("cursor", 0, count);
                 }
             }}></div>


        {/* Hotbar */}
        <InventoryDiv className="hotbar-inventory inventory" style={isMobile ? {width: "50%"} : {}}
                      inventoryType={Inventories.Hotbar} ikey="hi" handindex={handIndexState}></InventoryDiv>


        {/* Player Inventory */}
        <div className="player-inventory-container" style={playerInventoryOn[0] ? {scale: "1"} : {}}>
            <InventoryDiv className="inv-pp inventory" inventoryType={Inventories.Player}
                          ikey="pp"></InventoryDiv>
            <InventoryDiv className="inv-ph inventory" inventoryType={Inventories.Hotbar}
                          ikey="ph"></InventoryDiv>
            <InventoryDiv className="inv-pa inventory" inventoryType={Inventories.Armor} ikey="pa"></InventoryDiv>
            <InventoryDiv className="inv-pcs inventory" inventoryType={Inventories.CraftingSmall}
                          ikey="pcs"></InventoryDiv>
            <InventoryDiv className="inv-pcr inventory" inventoryType={Inventories.CraftingSmallResult}
                          ikey="pcr"></InventoryDiv>
        </div>

        {/* Cursor Inventory */}
        <InventoryDiv className="cursor-inventory inventory" inventoryType={Inventories.Cursor} style={{
            left: mouseX[0] + "px",
            top: mouseY[0] + "px"
        }} ikey="cursorInv"></InventoryDiv>


        {/* Options */}
        <OptionsPopup showSaveAndQuit={true} opt={optionPopup} clientUUID={O.clientUUID}/>


        {/* Mobile Control Buttons */}
        <div className="mobile-controls" hidden={!isMobile}>
            <div className="mobile-up"
                 onTouchStart={() => Keyboard.w = true}
                 onTouchEnd={() => Keyboard.w = false}></div>
            <div className="mobile-left"
                 onTouchStart={() => Keyboard.a = true}
                 onTouchEnd={() => Keyboard.a = false}></div>
            <div className="mobile-right"
                 onTouchStart={() => Keyboard.d = true}
                 onTouchEnd={() => Keyboard.d = false}></div>
        </div>


        {/* The screen that only pops up when saving */}
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