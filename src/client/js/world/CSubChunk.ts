import {createCanvas} from "@/utils/Texture";
import {clientPlayer} from "@dom/Client";
import {BM} from "@/meta/ItemIds";
import World from "@/world/World";
import {ChunkLength} from "@/meta/WorldConstants";
import {cx2x, cy2y, i2rx, i2ry, rxry2ci} from "@/utils/Utils";
import {drawShadow} from "@c/utils/Utils";

const renderScale = 16; // Blocks are rendered as 16x16
const renderSize = renderScale * ChunkLength;

export default class CSubChunk {
    bCanvas = createCanvas(renderSize, renderSize);
    bCtx = this.bCanvas.getContext("2d");
    bDone = false;
    bList = new Set<number>;

    sCanvas = createCanvas(renderSize, renderSize);
    sCtx = this.sCanvas.getContext("2d");
    sDone = false;
    sList = new Set<number>;

    subIndex: number;
    xIndex: number;
    yIndex: number;

    constructor(public world: World, public x: number, public y: number) {
        this.bCtx.imageSmoothingEnabled = false;
        this.subIndex = y * ChunkLength * ChunkLength;
        this.xIndex = cx2x(x);
        this.yIndex = cy2y(y);
    };

    get chunk() {
        return this.world.getChunk(this.x, false);
    };

    __renderBlock(
        relX: number, relY: number, fullId: number, clear: boolean
    ) {
        const ctx = this.bCtx;
        const block = BM[fullId];
        const dx = relX * renderScale;
        const dy = renderScale * (ChunkLength - relY);
        const dw = renderScale;
        const dh = -renderScale;
        if (block && block.hasTexture()) {
            if (block.isSlab || block.isStairs || block.liquid) {
                ctx.clearRect(dx, dy, dw, dh);
            }
            block.renderBlock(ctx, dx, dy, dw, dh);
        } else if (clear) {
            ctx.clearRect(dx, dy, dw, dh);
        }

        /*setTimeout(() => {
            ctx.fillStyle = "white";
            ctx.font = "10px Calibri";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this.getLight(relX, relY).toFixed(0).toString(), dx + dw / 2, dy + dh / 2);
        }, 300);*/
    };

    __renderShadow(
        relX: number, relY: number,
        opacity: number
    ) {
        const ctx = this.sCtx;
        const dx = relX * renderScale;
        const dy = renderScale * (ChunkLength - relY);
        const dw = renderScale;
        const dh = -renderScale;
        ctx.clearRect(dx, dy, dw, dh);
        if (opacity <= 0) return;
        drawShadow(ctx, dx, dy, dw, dh, opacity);
    };

    prepare(blocks = true, shadows = true) {
        if (blocks) this.bDone = false;
        if (shadows) this.sDone = false;
    };

    prepareBlock(relX: number, relY: number, blocks = true, shadows = true) {
        const i = rxry2ci(relX, relY);
        if (blocks) this.bList.add(i);
        if (shadows) this.sList.add(i);
    };

    getShadowOpacity(relX: number, relY: number) {
        return clientPlayer.world.getShadowOpacity(this.xIndex + relX, this.yIndex + relY);
    };

    getLight(relX: number, relY: number) {
        return clientPlayer.world.getLightLevelAt(this.xIndex + relX, this.yIndex + relY);
    };

    renderBlock(relX: number, relY: number) {
        if (!clientPlayer.seeShadows && this.getShadowOpacity(relX, relY) === 1) return;
        const i = rxry2ci(relX, relY) + this.subIndex;
        this.__renderBlock(relX, relY, this.chunk.blocks[i], true);
    };

    renderShadow(relX: number, relY: number) {
        this.__renderShadow(relX, relY, this.getShadowOpacity(relX, relY));
    };

    render(force = false) {
        if (force || !this.bDone || !this.sDone) {
            const bCtx = this.bCtx;
            const sCtx = this.sCtx;
            const chunk = this.chunk.blocks;
            const subIndex = this.subIndex;
            if (!this.bDone) this.bList.clear();
            if (!this.sDone) this.sList.clear();

            if (!this.bDone) bCtx.clearRect(0, 0, renderSize, renderSize);
            if (!this.sDone) sCtx.clearRect(0, 0, renderSize, renderSize);
            for (let relX = 0; relX < ChunkLength; relX++) {
                for (let relY = 0; relY < ChunkLength; relY++) {
                    const i = rxry2ci(relX, relY) + subIndex;
                    const opacity = this.getShadowOpacity(relX, relY);

                    if ((opacity < 1 || !clientPlayer.seeShadows) && !this.bDone) {
                        this.__renderBlock(relX, relY, chunk[i], false);
                    }

                    if (clientPlayer.seeShadows && opacity > 0 && !this.sDone) {
                        this.__renderShadow(relX, relY, opacity);
                    }
                }
            }

            this.bDone = true;
            this.sDone = true;
        }

        for (const i of this.bList) {
            this.renderBlock(i2rx(i), i2ry(i));
        }

        for (const i of this.sList) {
            this.renderShadow(i2rx(i), i2ry(i));
        }

        this.bList.clear();
        this.sList.clear();
    };
}