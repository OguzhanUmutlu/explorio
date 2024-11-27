import {Particle} from "@client/js/particle/Particle";
import {ItemMetadata} from "@explorio/meta/Items";

export class LittleBlockParticle extends Particle {
    t = 1;

    constructor(x: number, y: number, public block: ItemMetadata) {
        super(x, y);
    };

    update(dt: number) {
        this.t -= dt;
        if (this.t <= 0) this.done = true;
    };

    render(ctx: CanvasRenderingContext2D, x: number, y: number, tileSize: number) {
        if (this.done) return;
        const r = tileSize / 10;
        ctx.save();
        ctx.globalAlpha = this.t;
        this.block.render(ctx, x - r / 2, y - r / 2, r, r);
        ctx.restore();
    };
}