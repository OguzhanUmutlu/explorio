import {Particle} from "@client/js/particle/Particle";
import {ItemMetadata} from "@explorio/meta/Items";

export class LittleBlockParticle extends Particle {
    tm = 1.5;
    t = this.tm;
    vx = 0;
    vy = 0

    constructor(x: number, y: number, public block: ItemMetadata) {
        super(x, y);

        const cx = x - Math.round(x);
        const cy = Math.abs(y - Math.round(y));

        this.vx = Math.min(0.5, Math.max(-0.5, 0.005 / cx));
        this.vy = Math.min(0.5, 0.005 / cy) * 2.5;
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
        this.block.render(ctx, x - r / 2, y - r / 2, r, r);
        ctx.restore();
    };
}