import {createCanvas} from "../../../common/utils/Texture";
import {ChunkLength, ChunkLengthBits} from "../../../common/utils/Utils";
import {clientPlayer} from "../../Client";
import {f2id, f2meta} from "../../../common/meta/Items";
import {I, IM} from "../../../common/meta/ItemIds";
import {World} from "../../../common/world/World";

const renderScale = 16; // Blocks are rendered as 16x16
const renderSize = renderScale * ChunkLength;

function __renderBlock(
    relX: number, relY: number, fullId: number,
    ctx: CanvasRenderingContext2D
) {
    const id = f2id(fullId);
    const meta = f2meta(fullId);
    if (id !== I.AIR) {
        const texture = IM[id].getTexture(meta);
        const dx = relX * renderScale;
        const dy = renderScale * (ChunkLength - relY);
        const dw = renderScale;
        const dh = -renderScale;
        ctx.drawImage(texture.image, dx, dy, dw, dh);
        if (!texture.loaded) texture.wait().then(img => ctx.drawImage(img, dx, dy, dw, dh));
    }
}

function __renderShadow(
    relX: number, relY: number,
    depth: number, ctx: CanvasRenderingContext2D
) {
    const dx = relX * renderScale;
    const dy = renderScale * (ChunkLength - relY);
    const dw = renderScale;
    const dh = -renderScale;
    ctx.save();
    ctx.fillStyle = "black";
    ctx.globalAlpha = [1, 0.8, 0.5][depth];
    ctx.fillRect(dx, dy, dw, dh);
    ctx.restore();
}

export class CSubChunk {
    bCanvas = createCanvas(renderSize, renderSize);
    bCtx = this.bCanvas.getContext("2d");
    bDone = false;

    sCanvas = createCanvas(renderSize, renderSize);
    sCtx = this.sCanvas.getContext("2d");
    sDone = false;

    subIndex: number;

    chunkValue: Uint16Array;

    constructor(public world: World, public x: number, public y: number) {
        this.bCtx.imageSmoothingEnabled = false;
        this.subIndex = this.y * ChunkLength * ChunkLength;
    };

    prepare(blocks = true, shadows = true) {
        if (blocks) this.bDone = false;
        if (shadows) this.sDone = false;
    };

    getDepthAt(relX: number, relY: number) {
        return clientPlayer.world.getBlockDepth((this.x << ChunkLengthBits) | relX, (this.y << ChunkLengthBits) | relY)
    };

    updateValue() {
        return this.chunkValue = this.world.chunks[this.x];
    };

    renderBlock(relX: number, relY: number) {
        __renderBlock(relX, relY, this.updateValue()[relX + (relY << ChunkLengthBits) + this.subIndex], this.bCtx);
    };

    renderShadow(relX: number, relY: number) {
        __renderShadow(relX, relY, this.getDepthAt(relX, relY), this.sCtx);
    };

    render(force = false) {
        if (force || !this.bDone || !this.sDone) {
            const bCtx = this.bCtx;
            const sCtx = this.sCtx;
            const chunk = this.updateValue();
            const subIndex = this.subIndex;

            if (!this.bDone) bCtx.clearRect(0, 0, renderSize, renderSize);
            if (!this.sDone) sCtx.clearRect(0, 0, renderSize, renderSize);
            for (let relX = 0; relX < ChunkLength; relX++) {
                for (let relY = 0; relY < ChunkLength; relY++) {
                    const i = relX + (relY << ChunkLengthBits) + subIndex;
                    const depth = this.getDepthAt(relX, relY);

                    if (depth != 0 && !this.bDone) {
                        __renderBlock(relX, relY, chunk[i], bCtx);
                    }

                    if (depth < 3 && !this.sDone) {
                        __renderShadow(relX, relY, depth, sCtx);
                    }
                }
            }

            this.bDone = true;
            this.sDone = true;
        }
    };
}