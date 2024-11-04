import {World} from "../../../common/world/World";
import {clientPlayer} from "../Client";
import {CHUNK_LENGTH, CHUNK_LENGTH_BITS} from "../../../common/utils/Utils";
import {Canvas, createCanvas} from "../../../common/utils/Texture";
import {f2id, f2meta} from "../../../common/meta/Items";
import {I, IM} from "../../../common/meta/ItemIds";

export class CWorld extends World {
    renderedSubChunks: Record<number, Canvas[]> = {};

    ensureChunk(x, generate = true) {
        super.ensureChunk(x, generate);
        this.renderedSubChunks[x] ??= [];
    };

    async loadChunk(x) {
        return false;
    };

    renderSubChunk(x: number, y: number) {
        this.ensureChunk(x);
        const chunk = this.chunks[x];
        const tileSize = 16;
        if (!this.renderedSubChunks[x][y]) {
            const canvas = this.renderedSubChunks[x][y] = createCanvas(tileSize * CHUNK_LENGTH, tileSize * CHUNK_LENGTH);
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const subIndex = y * CHUNK_LENGTH * CHUNK_LENGTH;
            const promImm = {then: r => r()};
            for (let X = 0; X < CHUNK_LENGTH; X++) {
                for (let Y = 0; Y < CHUNK_LENGTH; Y++) {
                    const i = X + (Y << CHUNK_LENGTH_BITS) + subIndex;
                    const depth = clientPlayer.world.getBlockDepth((x << CHUNK_LENGTH_BITS) | X, (y << CHUNK_LENGTH_BITS) | Y);
                    let prom = promImm;
                    if (depth != 0) {
                        const fullId = chunk[i];
                        const id = f2id(fullId);
                        const meta = f2meta(fullId);
                        if (id !== I.AIR) {
                            const texture = IM[id].getTexture(meta);
                            const dx = X * tileSize;
                            const dy = canvas.height - Y * tileSize;
                            const dw = tileSize;
                            const dh = -tileSize;
                            ctx.drawImage(texture.image, dx, dy, dw, dh);
                            if (!texture.loaded) prom = texture.wait().then(img => ctx.drawImage(img, dx, dy, dw, dh));
                        }
                    }
                    if (depth < 3) {
                        const dx = X * tileSize;
                        const dy = canvas.height - Y * tileSize;
                        const dw = tileSize;
                        const dh = -tileSize;
                        prom.then(() => {
                            ctx.save();
                            ctx.fillStyle = "black";
                            ctx.globalAlpha = [1, 0.8, 0.5][depth];
                            ctx.fillRect(dx, dy, dw, dh);
                            ctx.restore();
                        });
                    }
                }
            }
        }
    };

    _setBlock(x, y, fullId, generate = true, polluteChunk = true, broadcast = true) {
        const b = super._setBlock(x, y, fullId, generate, polluteChunk, broadcast);
        if (b) {
            x = x >> CHUNK_LENGTH_BITS;
            y = y >> CHUNK_LENGTH_BITS;
            if (this.renderedSubChunks[x]) this.renderedSubChunks[x][y] = null;
        }
        return b;
    };
}