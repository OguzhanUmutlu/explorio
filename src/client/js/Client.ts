import {WORLD_HEIGHT} from "../../common/world/World";
import "./Texture";
import {OriginPlayer} from "./entity/OriginPlayer";
import {initItems, ItemIds, ItemTextures} from "../../common/Items";
import "../../common/compound/Tag";
import {BoundingBox} from "../../common/BoundingBox";
import {Item} from "../../common/Item";
import {CServer} from "./CServer";
import {getServerList, getWorldList} from "./Utils";

export let canvas: HTMLCanvasElement;
export let ctx: CanvasRenderingContext2D;
let f3: HTMLDivElement;
export const TILE_SIZE = 64;

export let clientServer: CServer;

export let clientPlayer: OriginPlayer;

export const camera = {x: 0, y: 0};

const hash = location.hash.substring(1);

if (!hash) location.href = "./";

export const ServerData = getServerList().find(i => i.uuid === hash);
export const WorldData = getWorldList().find(i => i.uuid === hash);

export const isOnline = ServerData;

let canRenderInventory = false;
let canRenderContainer = false;

export function updateCamera() {
    camera.x = clientPlayer.x + (Mouse._xSmooth / innerWidth * 2 - 1) * 40 / TILE_SIZE;
    camera.y = clientPlayer.y + clientPlayer.bb.height - 1 - (Mouse._ySmooth / innerHeight * 2 - 1) * 40 / TILE_SIZE;
}

function onResize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    ctx.imageSmoothingEnabled = false;
    updateMouse();
    updateCamera()
}

export let Keyboard: Record<string, boolean> = {};
export const Mouse = {x: 0, y: 0, _x: 0, _y: 0, _xSmooth: 0, _ySmooth: 0, left: false, right: false, middle: false};

export function updateMouse() {
    Mouse.x = (Mouse._x - canvas.width / 2 + camera.x * TILE_SIZE) / TILE_SIZE;
    Mouse.y = (-Mouse._y + canvas.height / 2 + camera.y * TILE_SIZE) / TILE_SIZE;
}

let smoothedFPS = 144;
let fps = 144;
let lastRender = performance.now() - 1;
let lastUpdate = performance.now() - 1;

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
    const id = clientPlayer.world.getBlockId(x, y);
    if (id !== ItemIds.AIR) {
        let texture = ItemTextures[id];
        if (Array.isArray(texture)) texture = texture[clientPlayer.world.getBlockMeta(x, y) % texture.length];
        const pos = getClientPosition(x - 0.5, y + 0.5);
        ctx.drawImage(texture.image,
            pos.x,
            pos.y,
            TILE_SIZE + 2, TILE_SIZE + 2 // for floating point error
        );
    }
}

function animate() {
    requestAnimationFrame(animate);
    const dt = (Date.now() - lastRender) || 1;
    lastRender = Date.now();
    fps = Math.round(1000 / dt);
    smoothedFPS = smoothedFPS * 0.5 + fps * 0.5;
    f3.innerHTML = `FPS: ${Math.floor(smoothedFPS)}<br>
X: ${clientPlayer.x.toFixed(2)}<br>
Y: ${clientPlayer.y.toFixed(2)}<br>
Vx: ${clientPlayer.vx.toFixed(2)}<br>
Vy: ${clientPlayer.vy.toFixed(2)}`;

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
                ctx.fillRect(pos.x, pos.y, TILE_SIZE + 2, TILE_SIZE + 2);
                ctx.restore();
            }
        }
    }

    updateMouse();
    clientPlayer.render();

    const smoothDt = Math.min(dt, 15) / 1000 * 12; // TODO: Add this to settings (The number 12)
    Mouse._xSmooth += (Mouse._x - Mouse._xSmooth) * smoothDt;
    Mouse._ySmooth += (Mouse._y - Mouse._ySmooth) * smoothDt;

    const mrx = Math.round(Mouse.x);
    const mry = Math.round(Mouse.y);

    const mouseBlock = clientPlayer.world.getBlockId(mrx, mry);
    if (
        mry >= 0 &&
        mry < WORLD_HEIGHT &&
        (mouseBlock !== ItemIds.AIR || clientPlayer.world.hasSurroundingBlock(mrx, mry)) &&
        clientPlayer.world.getBlockDepth(mrx, mry) >= 3
    ) {
        ctx.strokeStyle = "yellow";
        const blockPos = getClientPosition(mrx, mry);
        ctx.strokeRect(blockPos.x - TILE_SIZE / 2, blockPos.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    }

    if (canRenderInventory) {
    }
}

function update() {
    const now = performance.now();
    const dt = Math.min(((now - lastUpdate) || 1) / 1000, 0.15);
    lastUpdate = now;

    clientPlayer.update(dt);

    if (clientPlayer.inventory.checkAndCleanDirty()) {
        canRenderInventory = true;
    }
    if (clientPlayer.container.checkAndCleanDirty()) {
        canRenderContainer = true;
    }

    updateCamera();
}

export function initClient() {
    const cursorDiv = <HTMLDivElement>document.querySelector(".cursor");
    addEventListener("resize", onResize);
    addEventListener("keydown", e => Keyboard[e.key.toLowerCase()] = true);
    addEventListener("keyup", e => Keyboard[e.key.toLowerCase()] = false);
    addEventListener("blur", () => {
        Keyboard = {};
        Mouse.left = false;
        Mouse.right = false;
        Mouse.middle = false;
    });
    addEventListener("contextmenu", e => e.preventDefault());
    addEventListener("mousemove", e => {
        Mouse._x = e.pageX;
        Mouse._y = e.pageY;
        cursorDiv.style.left = `${Mouse._x}px`;
        cursorDiv.style.top = `${Mouse._y}px`;
        updateMouse();
    });
    addEventListener("mousedown", e => {
        if (e.button === 0) Mouse.left = true;
        if (e.button === 2) Mouse.right = true;
        if (e.button === 1) Mouse.middle = true;
    });
    addEventListener("mouseup", e => {
        if (e.button === 0) Mouse.left = false;
        if (e.button === 2) Mouse.right = false;
        if (e.button === 1) Mouse.middle = false;
    });

    clientServer = new CServer(WorldData.uuid);

    clientPlayer = new OriginPlayer;
    clientPlayer.world = clientServer.defaultWorld;

    clientPlayer.y = clientPlayer.world.getHighHeight(clientPlayer.x) + 1;

    canvas = <HTMLCanvasElement>document.querySelector("canvas");
    ctx = <CanvasRenderingContext2D>canvas.getContext("2d");
    f3 = <HTMLDivElement>document.querySelector(".f3-menu");

    Mouse._x = innerWidth / 2;
    Mouse._y = innerHeight / 2;
    Mouse._xSmooth = Mouse._x;
    Mouse._ySmooth = Mouse._y;

    initItems();

    onResize();
    setInterval(update);
    animate();

    setInterval(() => {
        clientPlayer.inventory.add(new Item(ItemIds.STONE));
    }, 1000);
}