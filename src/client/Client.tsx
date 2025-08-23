import React, {useEffect, useMemo, useState} from "react";
import "./css/client.css";
import {
    Div,
    drawShadow,
    formatDivText,
    getClientPosition,
    getServerList,
    getWorldList,
    Input,
    isMobileByAgent,
    loadOptions,
    Options,
    ReactState,
    renderBoundingBox,
    ResourcePack,
    saveOptions,
    ServerData,
    TileSize,
    WorldData
} from "@c/utils/Utils";
import CServer from "@c/CServer";
import ClientNetwork from "@c/network/ClientNetwork";
import OriginPlayer from "@c/entity/types/OriginPlayer";
import CWorld from "@c/world/CWorld";
import "fancy-printer";
import InventoryDiv, {animateInventories} from "@dom/components/InventoryDiv";
import {Containers, CraftingResultMap, InventorySizes} from "@/meta/Inventories";
import Server, {DefaultServerConfig} from "@/Server";
import PlayerNetwork from "@/network/PlayerNetwork";
import ParticleManager from "@c/particle/ParticleManager";
import Packet from "@/network/Packet";
import {ChunkLength, SubChunkAmount, WorldHeight} from "@/meta/WorldConstants";
import {cx2x, cy2y, rotateMeta, x2cx, y2cy} from "@/utils/Utils";
import {getMenus, OptionPages} from "@dom/components/options/Menus";
import CPlayer from "@c/entity/types/CPlayer";
import Texture from "@/utils/Texture";
import InventoryContainer from "@dom/components/InventoryContainer";
import {ZWorldMetaData} from "@/world/World";
import {im2data} from "@/item/ItemFactory";
import {FileAsync} from "ktfile";

Printer.makeGlobal();

declare global {
    interface Window {
        showDirectoryPicker(options?: {
            id?: string,
            mode?: "read" | "readwrite" | "write",
            startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos" | "home" | "appdata"
        }): Promise<FileSystemDirectoryHandle>;
    }

    interface FileSystemDirectoryHandle {
        getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
        getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
        removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<FileSystemHandle>;
        entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    }

    const bfs: FileAsync;
}

export const IS_LOCALHOST = location.hostname === "localhost" || location.hostname === "127.0.0.1";
type PublicStates = {
    container: Containers, chatOpen: boolean, optionsPage: OptionPages, saveScreen: boolean,
    deathScreen: boolean, connectionText: string, f1: boolean, handIndex: number, health: number, armor: number,
    breathe: number, hunger: number, xpProgress: number, xpLevel: number, resourcePacks: ResourcePack[]
};
const DefaultPublicStates: Partial<PublicStates> = {
    container: Containers.Closed,
    chatOpen: false,
    optionsPage: "none",
    saveScreen: false,
    deathScreen: false,
    connectionText: "",
    f1: false,
    handIndex: 0,
    health: 20,
    armor: 0,
    breathe: 20,
    hunger: 20,
    xpProgress: 0,
    xpLevel: 0
};
export const states = {} as { [k in keyof PublicStates]: ReactState<PublicStates[k]> };

type F3States = "fps" | "x" | "y" | "vx" | "vy" | "momentum";
const f3 = {} as { [k in F3States]: ReactState<number> };

export let canvas: HTMLCanvasElement;
export let chatBox: Div;
export let chatInput: Input;
export let ctx: CanvasRenderingContext2D;
let f3Menu: Div;
let titleDiv: Div;
let subTitleDiv: Div;
let actionbarDiv: Div;
export let clientServer: CServer;
export let singlePlayerServer: Server;
export let serverNetwork: PlayerNetwork;
export let clientPlayer: OriginPlayer;
export let clientNetwork: ClientNetwork;
export const camera = {x: 0, y: 0};
export const cameraTarget = {x: 0, y: 0};
export let ServerInfo: ServerData;
export let WorldInfo: WorldData;
export let isMultiPlayer: boolean;
export const Keyboard: Record<string, boolean> = {};
export let particleManager: ParticleManager;
export let renderCollisionBoxes = false;
export let showChunkBorders = false;
const CAMERA_ZOOM_MAX = 10;
const CAMERA_ZOOM_MIN = 0.5;
let cameraZoomMultiplier = 1;
let cameraZoom = 1;
let cameraZoomRender = 1;

export function showDeathScreen() {
    states.deathScreen[1](true);
}

export function setTitleText(type: "title" | "subtitle" | "actionbar", text: string) {
    const div = type === "title" ? titleDiv : type === "subtitle" ? subTitleDiv : actionbarDiv;
    formatDivText(div, text);
}

export function resetKeyboard() {
    for (const k in Keyboard) delete Keyboard[k];
}

function updateTileSize() {
    return TileSize.value = Math.round(innerWidth / 21) * cameraZoomRender;
}

export function setConnectionText(text: string) {
    states.connectionText[1](text);
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
    const tileSize = TileSize.value;
    const smoothness = 0; // no smoothing for now

    cameraTarget.x = clientPlayer.x + (Mouse._xSmooth / innerWidth * 2 - 1) * 45 * cameraPan / tileSize;
    cameraTarget.y = clientPlayer.y + clientPlayer.bb.height - 1 - (Mouse._ySmooth / innerHeight * 2 - 1) * 45 * cameraPan / tileSize;
    camera.x += (cameraTarget.x - camera.x) * (1 - smoothness);
    camera.y += (cameraTarget.y - camera.y) * (1 - smoothness);
    /*
    // camera shake support no one asked for:
    camera.x += Math.sin(Date.now() * 1000) / tileSize * 6;
    camera.y += Math.sin(Date.now() * 1000) / tileSize * 6;
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
    Mouse.x = (Mouse._x - canvas.width / 2 + camera.x * TileSize.value) / TileSize.value;
    Mouse.y = (-Mouse._y + canvas.height / 2 + camera.y * TileSize.value) / TileSize.value;
    Mouse.rx = Math.round(Mouse.x);
    Mouse.ry = Math.round(Mouse.y);
    const mdx = Mouse.x - Mouse.rx;
    const mdy = Mouse.y - Mouse.ry;
    Mouse.rotation = (mdx > 0 ? (mdy > 0 ? 3 : 0) : (mdy > 0 ? 2 : 1));
}

let intervalId: ReturnType<typeof setTimeout>;
let frameId = 0;
let _fps = [];
let lastBlur = 2;

function render() {
    frameId = requestAnimationFrame(render);

    if (!chatBox || !canvas) return;

    if (lastBlur !== Options.blur_px) {
        lastBlur = Options.blur_px;
        document.documentElement.style.setProperty("--blur", `${lastBlur}px`);
    }

    if (!states.chatOpen[0] && chatBox.scrollTop !== chatBox.scrollHeight) {
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

    const tileSize = updateTileSize();

    if (!f3Menu.hidden) {
        f3.fps[1](Math.floor(_fps.length));
        f3.x[1](+clientPlayer.x.toFixed(2));
        f3.y[1](+clientPlayer.y.toFixed(2));
        f3.vx[1](+clientPlayer.vx.toFixed(2));
        f3.vy[1](+clientPlayer.vy.toFixed(2));
        f3.momentum[1](+clientPlayer.momentum.toFixed(2));
    }

    if (document.activeElement !== document.body) {
        resetKeyboard();
    }

    updateMouse();
    updateCamera();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const minX = Math.floor(camera.x - innerWidth / tileSize / 2);
    const minY = Math.max(0, Math.floor(camera.y - innerHeight / tileSize / 2));
    const maxX = Math.ceil(camera.x + innerWidth / tileSize / 2);
    const maxY = Math.min(WorldHeight - 1, Math.ceil(camera.y + innerHeight / tileSize / 2));

    const minSubX = x2cx(minX) - 1;
    const minSubY = Math.max(0, y2cy(minY) - 1);
    const maxSubX = x2cx(maxX) + 1;
    const maxSubY = Math.min(SubChunkAmount - 1, y2cy(maxY) + 1);
    const subLength = tileSize * ChunkLength;

    const world = clientPlayer.world as CWorld;

    particleManager.render(ctx, dt);

    for (let chunkX = minSubX; chunkX <= maxSubX; chunkX++) {
        const chunk = world.getChunk(chunkX);
        if (!chunk.isFilled) continue;
        for (let chunkY = minSubY; chunkY <= maxSubY; chunkY++) {
            world.renderSubChunk(chunkX, chunkY);
            const render = world.subChunkRenders[chunkX][chunkY];
            const pos = getClientPosition(cx2x(chunkX) - 0.5, cy2y(chunkY) - 0.5);
            ctx.drawImage(render.bCanvas, pos.x, pos.y, subLength + 0.5, -subLength - 0.5);
            if (clientPlayer.seeShadows) ctx.drawImage(render.sCanvas, pos.x, pos.y, subLength + 0.5, -subLength - 0.5);
        }
    }

    if (showChunkBorders) {
        for (let chunkX = minSubX; chunkX <= maxSubX; chunkX++) {
            for (let chunkY = minSubY; chunkY <= maxSubY; chunkY++) {
                const pos = getClientPosition(cx2x(chunkX) - 0.5, cy2y(chunkY) - 0.5);
                ctx.strokeStyle = "#ff0000";
                ctx.strokeRect(pos.x, pos.y, subLength + 0.5, -subLength - 0.5);
                // ctx.strokeStyle = "#00ff00";
                // ctx.strokeRect(pos.x + tileSize / 2, pos.y - tileSize / 2, subLength + 0.5, -subLength - 0.5);
                ctx.fillStyle = "#0000ff";
                ctx.fillRect(pos.x - tileSize / 2, 0, 1, canvas.height);
            }
        }
    }

    const chunkXMiddle = clientPlayer.chunkX;
    for (let chunkX = chunkXMiddle - 2; chunkX <= chunkXMiddle + 2; chunkX++) {
        const entities = world.getChunkEntities(chunkX);
        for (const entity of entities) {
            if (entity instanceof CPlayer && entity.breaking) {
                const block = world.getBlock(entity.breaking[0], entity.breaking[1]);
                const breakTime = block.getBreakTime(entity.handItem);
                const ratio = 1 - entity.breakingTime / breakTime;
                const blockPos = getClientPosition(entity.breaking[0], entity.breaking[1]);
                ctx.drawImage(
                    Texture.get(`assets/textures/destroy/${Math.max(0, Math.min(9, Math.floor(ratio * 10)))}.png`).image,
                    blockPos.x - tileSize / 2, blockPos.y - tileSize / 2, tileSize, tileSize
                );
            }
        }

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

    const smoothDt = Math.min(dt, 0.015) * Options.camera_speed;
    Mouse._xSmooth += (Mouse._x - Mouse._xSmooth) * smoothDt;
    Mouse._ySmooth += (Mouse._y - Mouse._ySmooth) * smoothDt;

    const item = clientPlayer.handItem;
    if (clientPlayer.canBreakBlock() || clientPlayer.canPlaceBlock() || clientPlayer.canInteractBlock()) {
        ctx.save();
        const shadow = world.getShadowOpacity(Mouse.rx, Mouse.ry);
        const p = 1200;
        ctx.globalAlpha = (1 - 2 / p * Math.abs((Date.now() % p) - p / 2)) * 0.3 + 0.2;
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        const blockPos = getClientPosition(Mouse.rx, Mouse.ry);
        if (item) {
            const rotated = rotateMeta(item.id, item.meta, Mouse.rotation);
            const block = im2data(item.id, rotated);
            if (block && clientPlayer.canPlaceBlock()) {
                block.renderBlock(ctx, blockPos.x - TileSize.value / 2, blockPos.y - TileSize.value / 2, TileSize.value, TileSize.value, false, world, Mouse.rx, Mouse.ry);
                drawShadow(ctx, blockPos.x - TileSize.value / 2, blockPos.y - TileSize.value / 2, TileSize.value, TileSize.value, shadow / 2);
            }
        }
        ctx.strokeRect(blockPos.x - TileSize.value / 2, blockPos.y - TileSize.value / 2, TileSize.value, TileSize.value);
        ctx.restore();
    }

    animateInventories();
}

function update(dt: number) {
    if (singlePlayerServer && singlePlayerServer.pausedUpdates) return;
    const world = clientPlayer.world;

    const chunkXMiddle = clientPlayer.chunkX;
    for (let chunkX = chunkXMiddle - 1; chunkX <= chunkXMiddle + 1; chunkX++) {
        const entities = Array.from(world.getChunkEntities(chunkX));
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            entity.update(dt);
        }
    }

    clientNetwork.releaseBatch();

    if (
        world.chunks[clientPlayer.chunkX]
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

    if (Keyboard.r) {
        const handItem = clientPlayer.handItem;
        if (handItem) {
            clientNetwork.sendDropItem("hotbar", clientPlayer.handIndex, handItem.count);
            clientPlayer.handItem = null;
        }
    }
}

const chatHistory = [""];
let chatIndex = 0;
let lastRender = Date.now() - 1;

function onWheel(e: WheelEvent) {
    if (isAnyUIOpen() || !Options.dynamic_zoom) return;

    if (e.altKey) {
        if (e.deltaY > 0) cameraZoomMultiplier *= 0.9;
        else cameraZoomMultiplier *= 1.1;
        cameraZoomMultiplier = Math.max(CAMERA_ZOOM_MIN, Math.min(CAMERA_ZOOM_MAX, cameraZoomMultiplier));
        e.preventDefault();
    } else {
        clientNetwork.sendHandIndex((clientPlayer.handIndex + (e.deltaY > 0 ? 1 : -1) + InventorySizes.hotbar) % InventorySizes.hotbar);
    }
}

// Whether any F3 sub-shortcut has been executed
let executedF3 = false;

function onPressKey(e: KeyboardEvent) {
    if (Keyboard.f3 && e.key.toLowerCase() in F3Macro) {
        return;
    }

    if (isAnyUIOpen()) {
        if (!isInChat() && e.key.toLowerCase() === "e") {
            clientPlayer.setContainerId(Containers.Closed);
            clientNetwork.sendCloseInventory();
        }

        if (e.key === "Escape") {
            closeChat();

            if (clientPlayer.containerId !== Containers.Closed) {
                clientPlayer.setContainerId(Containers.Closed);
                clientNetwork.sendCloseInventory();
            }

            states.optionsPage[1]("none");
        }

        const invName = clientPlayer.hoveringInventory;
        const fromInv = clientPlayer.inventories[invName];
        if (states.container[0] !== Containers.Closed && fromInv) {
            const fromItem = fromInv.get(clientPlayer.hoveringIndex);
            const num = +e.key;
            if (num && num >= 1 && num <= 9 && clientPlayer.hoveringInventory) {
                const fromIndex = clientPlayer.hoveringIndex;
                const isFromResult = clientPlayer.hoveringInventory in CraftingResultMap;
                const toIndex = num - 1;
                if (fromInv === clientPlayer.hotbarInventory && toIndex === fromIndex) return;

                const fromItem = fromInv.get(fromIndex);
                const toItem = clientPlayer.hotbarInventory.get(toIndex);

                if (fromItem || toItem) {
                    if (isFromResult) {
                        if (toItem && (
                            !toItem.equals(fromItem, false, true)
                            || toItem.count + fromItem.count > toItem.maxStack
                        )) return;

                        clientNetwork.makeItemTransfer(invName, fromIndex, [{
                            inventory: "hotbar",
                            index: toIndex,
                            count: fromItem.count
                        }]);
                    } else {
                        clientNetwork.makeItemSwap(invName, fromIndex, "hotbar", toIndex);
                    }
                }
            } else if (e.key.toLowerCase() === "q") {
                if (fromItem) {
                    fromInv.decreaseItemAt(clientPlayer.hoveringIndex);
                    clientNetwork.sendDropItem(invName, clientPlayer.hoveringIndex, 1);
                }
            } else if (e.key.toLowerCase() === "r") {
                if (fromItem) {
                    fromInv.removeIndex(clientPlayer.hoveringIndex);
                    clientNetwork.sendDropItem(invName, clientPlayer.hoveringIndex, fromItem.count);
                }
            }
        }
    } else {
        Keyboard[e.key.toLowerCase()] = true;

        if (e.key.toLowerCase() === "t") {
            openChat();
            e.preventDefault();
        }

        if (e.key === ".") {
            openChat();
            putIntoChat("/");
            e.preventDefault();
        }

        if (e.key.toLowerCase() === "e") {
            clientPlayer.setContainerId(Containers.PlayerInventory);
            clientNetwork.sendOpenInventory();
        }

        if (e.key === "Escape") {
            states.optionsPage[1]("main");
        }

        if (e.key === "F3") {
            executedF3 = false;
            e.preventDefault();
        }

        if (e.key === "F1") {
            states.f1[1](!states.f1[0]);
            e.preventDefault();
        }

        if (!isNaN(parseInt(e.key)) && e.key !== "0") {
            clientNetwork.sendHandIndex(parseInt(e.key) - 1);
        }

        if (e.key.toLowerCase() === "q") {
            const handItem = clientPlayer.handItem;
            if (handItem) {
                clientPlayer.hotbarInventory.decreaseItemAt(clientPlayer.handIndex);
                clientNetwork.sendDropItem("hotbar", clientPlayer.handIndex, 1);
            }
        }
    }
}

let lastSpace = 0;

const F3Macro = {
    "b": () => {
        renderCollisionBoxes = !renderCollisionBoxes;
        clientPlayer.sendMessage(`§e§l[Debug] §rEntity collisions ${renderCollisionBoxes ? "enabled" : "disabled"}.`);
    },
    "g": () => {
        showChunkBorders = !showChunkBorders;
        clientPlayer.sendMessage(`§e§l[Debug] §rChunk borders ${showChunkBorders ? "enabled" : "disabled"}.`);
    },
    "d": () => chatBox.innerText = "",
    "q": () => {
        clientPlayer.sendMessage("§dF3 + B: Toggle visibility of hitboxes of visible entities.");
        clientPlayer.sendMessage("§dF3 + G: Toggles visibility of the chunk borders around the player.");
        clientPlayer.sendMessage("§dF3 + D: Clear chat history.");
    }
};

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
            for (const key in F3Macro) if (Keyboard[key]) {
                F3Macro[key]();
                return;
            }

            if (!executedF3) f3Menu.hidden = !f3Menu.hidden;
        } else if (Keyboard.f3 && F3Macro[e.key]) {
            F3Macro[e.key]();
            executedF3 = true;
        }
    }
}

function onLoseFocus() {
    resetKeyboard();
    Mouse.left = false;
    Mouse.right = false;
    Mouse.middle = false;
    if (Options.pauseOnBlur && !isAnyUIOpen()) {
        states.optionsPage[1]("main");
        closeChat();
    }
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
        clientPlayer.rightClicked();
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
    if (e.button === 1 && clientPlayer.infiniteResource) {
        Mouse.middle = true;
        const block = clientPlayer.world.getBlock(Mouse.x, Mouse.y);
        const item = block.toItem();
        if (!item) return;
        clientPlayer.handItem = item;
        clientNetwork.sendSetItem("hotbar", clientPlayer.handIndex, item);
    }
    if (e.button === 2) Mouse.right = true;
}

function onMouseUp(e: MouseEvent) {
    if (e.button === 0) Mouse.left = false;
    if (e.button === 1) Mouse.middle = false;
    if (e.button === 2) Mouse.right = false;
}

function putIntoChat(input: string) {
    chatInput.value = input;
    requestAnimationFrame(() => chatInput.setSelectionRange(input.length, input.length));
}

function onChatKeyPress(e: KeyboardEvent) {
    if (e.key === "ArrowUp" || e.key === "KeyUp") {
        if (chatIndex > 0) {
            if (chatIndex === chatHistory.length - 1) {
                chatHistory[chatIndex] = chatInput.value;
            }
            chatIndex--;
            putIntoChat(chatHistory[chatIndex]);
        }
    } else if (e.key === "ArrowDown" || e.key === "KeyDown") {
        if (chatIndex < chatHistory.length - 1) {
            chatIndex++;
            putIntoChat(chatHistory[chatIndex]);
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

export function initClient(clientUUID: string) {
    states.connectionText[1]("");
    states.saveScreen[1](false);
    states.deathScreen[1](false);
    Mouse = {...DefaultMouse};
    resetKeyboard();
    Error.stackTraceLimit = 50;
    chatHistory.length = 0;
    chatHistory.push("");
    chatIndex = 0;
    lastRender = Date.now() - 1;
    ServerInfo = getServerList().find(i => i.uuid === clientUUID);
    WorldInfo = getWorldList().find(i => i.uuid === clientUUID);
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
    clientServer.registerDefaults();
    clientServer.config = DefaultServerConfig;
    clientServer.defaultWorld = new CWorld(clientServer, "", null, 0n, null, ZWorldMetaData.parse(DefaultServerConfig.defaultWorlds.default));
    clientServer.defaultWorld.ensureSpawnChunks();

    const req = {socket: {remoteAddress: "::ffff:127.0.0.1"}};

    clientPlayer = OriginPlayer.spawn(clientServer.defaultWorld);
    clientPlayer.name = isMultiPlayer ? (Options.fallbackUsername || "Steve") : "Player";

    clientPlayer.immobile = true;
    clientNetwork = new ClientNetwork;
    if (isMultiPlayer) {
        states.connectionText[1]("Connecting...");
        clientNetwork._connect().then(r => r); // not waiting for it to connect
    } else {
        const server = singlePlayerServer = new Server(bfs.to(WorldInfo.uuid));
        Error.stackTraceLimit = 50;

        const config = server.config = DefaultServerConfig;
        config.saveIntervalTicks = Options.auto_save * 20;
        config.auth = null;

        //if (bfs.existsSync(server.path + "/worlds")) bfs.rmSync(server.path + "/worlds", {recursive: true});
        //if (bfs.existsSync(server.path + "/players")) bfs.rmSync(server.path + "/players", {recursive: true});

        server.init().then(() => {
            server.bans = [];

            serverNetwork = new PlayerNetwork(server, {
                send(data: Buffer) {
                    clientNetwork.processPacketBuffer(data);
                },
                kick() {
                    printer.warn("Got kicked for some reason? did you kick yourself?");
                },
                close() {
                    printer.warn("Pseudo-closed the pseudo-socket. What a duo...");
                    serverNetwork.onClose().then(r => r);
                }
            }, req);

            clientNetwork.connected = true;
            clientNetwork.worker = {
                postMessage: (e: Buffer) => serverNetwork.processPacketBuffer(e),
                terminate: () => null
            };
            // faster but have to serialize things like items: clientNetwork.sendPacket = (pk: Packet) => serverNetwork.processPrePacket(pk);
            clientNetwork.sendPacket = (pk: Packet) => serverNetwork.processPacketBuffer(pk.serialize());

            clientNetwork.sendAuth(null, true);
        });
    }

    Mouse._x = innerWidth / 2;
    Mouse._y = innerHeight / 2;
    Mouse._px = 1;
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
    frameId = requestAnimationFrame(render);
}

export function terminateClient() {
    saveOptions();
    cancelAnimationFrame(frameId);
    clearInterval(intervalId);
    if (clientNetwork && clientNetwork.worker) {
        clientNetwork.worker.terminate();
        clientNetwork.worker = null;
    }
    if (singlePlayerServer) singlePlayerServer.close().then(r => r);
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
    console.clear();
}

export function saveAndQuit() {
    terminateClient();
    location.hash = "";
}

// todo: bug: fix non-rendering chunks in clients, i think this bug disappeared a few commits ago, question mark (?)
// todo: custom tree lengths and shapes like jungle etc.
// todo: bug: when you're falling and you hit the corner of a block, it kind of makes you faster? or it looks like it does? setup: staircase out of square stone blocks
// todo: zombies and cows
// todo: when the client gets a chunk and client leaves & gets back to that chunk, it shouldn't send the chunk data
//    again unless it's dirty. should have an object like Record<PlayerName, TimeOfLoad> in Chunk class, and
//    also have the lastDirty: number to check if the chunk was cleaned while the player was away
// todo: bug: at the end of every chunk, if the surface is let's say flat, the last block in that chunk will produce more light to bottom
// todo: render item damage
// todo: add back the lighting system with the new small block depth
// todo: advancement api
// todo: liquid flowing rendering
// todo: block animations, how would this even work? sub-chunk renders are cached? do we have multiple sub-chunk renders
//     that include every frame of animation? this actually doesn't sound like a bad idea. it's like a buffer cache.

// todo: add block details like little random rocks on grass or sand
// todo: make biome based grass textures
// todo: add inventory item tooltip and add an advanced mode to it via F3+G
// todo: add usernames on top of the players
// todo: when hand index changes briefly show the name of the item under the actionbar
// todo: remove Items.ts as it is getting messy. define blocks and items with classes and make them extend each other. Might have to implement a way of implementing more than one, or just find a nice way of it.
// todo: add support for using the virtual file system for assets, uploadable via a zip file (resource pack)
// todo: add title, subtitle, actionbar support with -> timings <-
// todo: render health/food/armor/breathe/xp
// todo: item/block states and maybe rename meta to variant?
// todo: add and implement shield in Damage.ts
// todo: desktop singleplayer should be automatically hosted on a random port, there should be a switch to allow outside connections
// todo: in mobile: cannot break blocks, cannot move because there's no movement buttons

function isInChat() {
    return states.chatOpen[0];
}

function closeChat() {
    states.chatOpen[1](false);
    chatInput.blur();
}

function openChat() {
    states.chatOpen[1](true);
    requestAnimationFrame(() => chatInput.focus());
}

function toggleChat() {
    if (isInChat()) closeChat();
    else openChat();
}

function isAnyUIOpen() {
    return states.container[0] !== Containers.Closed || states.saveScreen[0] || states.deathScreen[0]
        || states.connectionText[0] || states.optionsPage[0] !== "none" || isInChat();
}

function hasBlur() {
    return states.container[0] !== Containers.Closed || states.saveScreen[0] || states.deathScreen[0]
        || states.connectionText[0] || states.optionsPage[0] !== "none";
}

function F3Component(O: { ikey: string }) {
    f3[O.ikey] = useState(0);
    return <span>{f3[O.ikey][0]}</span>;
}

export default function Client(O: {
    clientUUID: ReactState<string>,
    favicon: ReactState<string>
}) {
    // @ts-expect-error This is for debugging purposes.
    window.dbg = {s: singlePlayerServer, p: clientPlayer};
    for (const k in DefaultPublicStates) states[k] = useState(DefaultPublicStates[k]);
    states.resourcePacks = useState([...Options.resourcePacks]);
    const mouseX = useState(0);
    const mouseY = useState(0);
    if (singlePlayerServer) singlePlayerServer.pausedUpdates = states.optionsPage[0] !== "none";

    useEffect(() => {
        loadOptions();

        function onMouseMove(e: MouseEvent) {
            mouseX[1](e.pageX);
            mouseY[1](e.pageY);
        }

        try {
            initClient(O.clientUUID[0]);
        } catch (e) {
            if (IS_LOCALHOST) throw e;
            console.error(e);
            alert("Couldn't load the world. " + e.message);
            location.hash = "";
            terminateClient();
            return;
        }
        if (singlePlayerServer && singlePlayerServer.closed) {
            if (singlePlayerServer.closeReason) {
                alert("The world was closed: " + singlePlayerServer.closeReason);
            }
            location.hash = "";
            terminateClient();
            return;
        }

        addEventListener("mousemove", onMouseMove);

        return () => {
            terminateClient();
            removeEventListener("mousemove", onMouseMove);
        };
    }, []);

    const isMobile = isMobileByAgent();

    return <>
        {/* F3 Menu */}
        {useMemo(() => <div className="f3-menu" ref={el => f3Menu = el} hidden={true}>
            FPS: <F3Component ikey="fps"/><br/>
            X: <F3Component ikey="x"/><br/>
            Y: <F3Component ikey="y"/><br/>
            VX: <F3Component ikey="vx"/><br/>
            VY: <F3Component ikey="vy"/><br/>
            M: <F3Component ikey="momentum"/>
        </div>, [])}


        {/* The game's canvas */}
        {useMemo(() => <canvas id="game" ref={el => canvas = el}></canvas>, [])}


        {/* Title text */}
        <div className="text-section title-text-section" ref={el => titleDiv = el}></div>
        <div className="text-section sub-title-text-section" ref={el => subTitleDiv = el}></div>
        <div className="text-section actionbar-text-section" ref={el => actionbarDiv = el}></div>


        {/* Chat Container */}
        {useMemo(() => {
            return <div className={states.chatOpen[0] ? "full-chat-container" : "chat-container"}
                        style={states.f1[0] && !states.chatOpen[0] ? {opacity: "0"} : {}}>
                <div className="chat-messages" ref={el => chatBox = el}>
                </div>
                <input className="chat-input" ref={el => chatInput = el}/>
            </div>;
        }, [states.f1, states.chatOpen])}


        {/* Mobile Chat Toggle Button */}
        <div className="mobile-chat-toggle"
             style={isMobile && !hasBlur() ? {} : {scale: "0"}}
             onClick={() => toggleChat()}></div>


        {/* Mobile Options Button */}
        <div className="mobile-options-open" style={isMobile && !hasBlur() ? {} : {scale: "0"}}
             onClick={() => {
                 closeChat();
                 states.optionsPage[1]("main");
             }}>
            {/* These are three dots. */}
            <div></div>
            <div></div>
            <div></div>
        </div>


        {/* Background Blur used in UIs */}
        <div className="background-blur" style={hasBlur() ? {
            opacity: "1", pointerEvents: "auto",
            ...(states.optionsPage[0] !== "none" ? {background: "rgba(0, 0, 0, 0.5)"} : {})
        } : {}}
             onClick={() => {
                 const cursorItem = clientPlayer.cursorItem;
                 if (states.container[0] !== Containers.Closed && cursorItem) {
                     const count = clientPlayer.cursorItem.count;
                     clientPlayer.cursorItem = null;
                     clientNetwork.sendDropItem("cursor", 0, count);
                 }
             }}></div>

        {/* Hotbar Container */}
        <div className="hotbar-container"
             style={isMobile ? {width: "50%"} : (states.f1[0] ? {"opacity": "0"} : {})}>
            <div className="space-between">
                <div>
                    <div className="armor">
                        <span className="armor-text"></span>
                    </div>
                    <div className="health">
                        <span className="health-text"></span>
                    </div>
                </div>
                <div>
                    <div className="breathe">
                        <span className="breathe-text"></span>
                    </div>
                    <div className="hunger">
                        <span className="hunger-text"></span>
                    </div>
                </div>
            </div>
            <div className="xp-bar"></div>
            <InventoryDiv className="hotbar-inventory inventory" inventoryName={"hotbar"} ikey="hi"
                          handIndex={states.handIndex}></InventoryDiv>
        </div>


        {/* Player Inventory */}
        <InventoryContainer containerId={Containers.PlayerInventory} containerState={states.container}
                            src="assets/textures/gui/container/inventory.png" className="player-inventory-container">
            <InventoryDiv className="inv-pp inventory" inventoryName={"player"}
                          ikey="pp"></InventoryDiv>
            <InventoryDiv className="inv-ph inventory" inventoryName={"hotbar"}
                          ikey="ph"></InventoryDiv>
            <InventoryDiv className="inv-pa inventory" inventoryName={"armor"} ikey="pa"></InventoryDiv>
            <InventoryDiv className="inv-po inventory" inventoryName={"offhand"} ikey="po"></InventoryDiv>
            <InventoryDiv className="inv-pcs inventory" inventoryName={"craftingSmall"}
                          ikey="pcs"></InventoryDiv>
            <InventoryDiv className="inv-pcr inventory" inventoryName={"craftingSmallResult"}
                          ikey="pcr"></InventoryDiv>
        </InventoryContainer>


        {/* Crafting Table Inventory */}
        <InventoryContainer containerId={Containers.CraftingTable} containerState={states.container}
                            src="assets/textures/gui/container/crafting_table.png" className="crafting-table-container">
            <InventoryDiv className="inv-cc inventory" inventoryName={"craftingBig"}
                          ikey="cc"></InventoryDiv>
            <InventoryDiv className="inv-ccr inventory" inventoryName={"craftingBigResult"}
                          ikey="ccr"></InventoryDiv>
            <InventoryDiv className="inv-cp inventory" inventoryName={"player"} ikey="cp"></InventoryDiv>
            <InventoryDiv className="inv-ch inventory" inventoryName={"hotbar"}
                          ikey="ch"></InventoryDiv>
        </InventoryContainer>


        {/* Furnace Inventory */}
        <InventoryContainer containerId={Containers.Furnace} containerState={states.container}
                            src="assets/textures/gui/container/furnace.png" className="furnace-container">
            <InventoryDiv className="inv-ffi inventory" inventoryName={"furnaceInput"}
                          ikey="ffi"></InventoryDiv>
            <InventoryDiv className="inv-fff inventory" inventoryName={"furnaceFuel"}
                          ikey="ff"></InventoryDiv>
            <InventoryDiv className="inv-ffr inventory" inventoryName={"furnaceResult"}
                          ikey="ffr"></InventoryDiv>
            <InventoryDiv className="inv-fp inventory" inventoryName={"player"} ikey="fp"></InventoryDiv>
            <InventoryDiv className="inv-fh inventory" inventoryName={"hotbar"}
                          ikey="fh"></InventoryDiv>
        </InventoryContainer>


        {/* Cursor Inventory */}
        <InventoryDiv className="cursor-inventory inventory" inventoryName={"cursor"} style={{
            left: mouseX[0] + "px",
            top: mouseY[0] + "px"
        }} ikey="cursorInv"></InventoryDiv>


        {/* Options */}
        {useMemo(() => {
            return <>{...getMenus("client", states.optionsPage)}</>;
        }, [states.resourcePacks[0], states.optionsPage[0]])}


        {/* Mobile Control Buttons */}
        {useMemo(() => {
            return <div className="mobile-controls" hidden={!isMobile}>
                <div className="mobile-up"
                     onTouchStart={() => Keyboard.w = true}
                     onTouchEnd={() => Keyboard.w = false}></div>
                <div className="mobile-left"
                     onTouchStart={() => Keyboard.a = true}
                     onTouchEnd={() => Keyboard.a = false}></div>
                <div className="mobile-right"
                     onTouchStart={() => Keyboard.d = true}
                     onTouchEnd={() => Keyboard.d = false}></div>
            </div>;
        }, [isMobile])}


        {/* The screen that pops up on death */}
        {useMemo(() => <div className="death-screen" style={
            states.deathScreen[0] ? {
                opacity: "1",
                pointerEvents: "auto"
            } : {}
        }>
            <h1>You Died!</h1>
            <div className="btn" onClick={() => {
                clientNetwork.sendRespawn();
                states.deathScreen[1](false);
            }}>Respawn
            </div>
            <div className="btn" onClick={() => saveAndQuit()}>Title Screen</div>
        </div>, [states.deathScreen[0]])}


        {/* The screen that only pops up when saving */}
        {useMemo(() => <div className="save-screen" style={
            states.saveScreen[0] ? {
                opacity: "1",
                pointerEvents: "auto"
            } : {}
        }>
            Saving the world...
        </div>, [states.saveScreen[0]])}


        {/* The screen used to display the connection or disconnection text */}
        {useMemo(() => <div className="connection-text" style={
            states.connectionText[0] ? {
                opacity: "1",
                pointerEvents: "auto"
            } : {}
        }>
            <h3>{states.connectionText[0]}</h3>
            <div className="btn" onClick={() => saveAndQuit()}>Title Screen</div>
        </div>, [states.connectionText[0]])}
    </>;
}