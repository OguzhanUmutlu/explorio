import {createCanvas} from "../../../common/utils/Texture";
import {CHUNK_LENGTH, CHUNK_LENGTH_BITS} from "../../../common/utils/Utils";
import {clientPlayer} from "../../Client";
import {f2id, f2meta} from "../../../common/meta/Items";
import {I, IM} from "../../../common/meta/ItemIds";
import {World} from "../../../common/world/World";

const renderScale = 16; // Blocks are rendered as 16x16
const renderSize = renderScale * CHUNK_LENGTH;

export class CSubChunk {
    size: number;
    canvas = createCanvas(renderSize, renderSize);
    ctx = this.canvas.getContext("2d");
    rendered = false;

    constructor(public world: World, public x: number, public y: number) {
        this.ctx.imageSmoothingEnabled = false;
    };

    render(force = false) {
        const rendered = this.rendered;
        if (force || !rendered) {
            const x = this.x;
            const y = this.y;
            const ctx = this.ctx;
            const chunk = this.world.chunks[x];

            ctx.clearRect(0, 0, renderSize, renderSize);
            const subIndex = y * CHUNK_LENGTH * CHUNK_LENGTH;
            for (let X = 0; X < CHUNK_LENGTH; X++) {
                for (let Y = 0; Y < CHUNK_LENGTH; Y++) {
                    const i = X + (Y << CHUNK_LENGTH_BITS) + subIndex;
                    const depth = clientPlayer.world.getBlockDepth((x << CHUNK_LENGTH_BITS) | X, (y << CHUNK_LENGTH_BITS) | Y);
                    let prom = {then: (r: any) => r()};
                    if (depth != 0) {
                        const fullId = chunk[i];
                        const id = f2id(fullId);
                        const meta = f2meta(fullId);
                        if (id !== I.AIR) {
                            const texture = IM[id].getTexture(meta);
                            const dx = X * renderScale;
                            const dy = renderScale * (CHUNK_LENGTH - Y);
                            const dw = renderScale;
                            const dh = -renderScale;
                            ctx.drawImage(texture.image, dx, dy, dw, dh);
                            if (!texture.loaded) prom = texture.wait().then(img => ctx.drawImage(img, dx, dy, dw, dh));
                        }
                    }
                    if (depth < 3) {
                        const dx = X * renderScale;
                        const dy = renderScale * (CHUNK_LENGTH - Y);
                        const dw = renderScale;
                        const dh = -renderScale;
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

            this.rendered = true;
        }
    };
}