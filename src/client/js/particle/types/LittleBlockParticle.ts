import Particle from "@c/particle/Particle";
import BlockData from "@/item/BlockData";
import {clientPlayer} from "@dom/Client";

export default class LittleBlockParticle extends Particle {
    tm = 1.5;
    t = this.tm;
    vx = 0;
    vy = 0;
    // pixel: Canvas;
    // color: string;

    constructor(x: number, y: number, public block: BlockData) {
        super(x, y);

        const cx = x - Math.round(x);
        const cy = Math.abs(y - Math.round(y));

        this.vx = Math.min(0.5, Math.max(-0.5, 0.005 / cx));
        this.vy = Math.min(0.5, 0.005 / cy);

        // const texture = block.getTexture();
        //
        // const xv = Math.floor(Math.random() * 4);
        // this.color = texture.pixelValue(xv, 0);
        // this.pixel = texture.pixel(Math.floor(Math.random() * 4), 0);
    };

    update(dt: number) {
        this.vy -= 3 * dt;

        this.x += this.vx * dt;
        this.y += 2 * this.vy * dt;

        this.t -= dt;
        if (this.t <= 0) this.done = true;
    };

    render(ctx: CanvasRenderingContext2D, x: number, y: number, tileSize: number) {
        if (this.done) return;
        const r = tileSize / 10;
        ctx.save();
        ctx.globalAlpha = this.t / this.tm;
        const x0 = x - r / 2;
        const y0 = y - r / 2;
        // ctx.fillStyle = this.color;
        // console.log(this.color)
        // ctx.drawImage(this.pixel, x0, y0, r, r);
        // ctx.fillRect(x0, y0, r, r);
        this.block.renderBlock(ctx, clientPlayer.world, this.x, x0, y0, r, r);
        ctx.restore();
    };
}