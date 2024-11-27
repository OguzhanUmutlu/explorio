import {Particle} from "@client/js/particle/Particle";
import {getClientPosition, Options} from "@client/js/utils/Utils";

export class ParticleManager {
    particles = new Set<Particle>;

    add(particle: Particle) {
        this.particles.add(particle);
    };

    remove(particle: Particle) {
        this.particles.delete(particle);
    };

    render(ctx: CanvasRenderingContext2D, dt: number) {
        for (const particle of this.particles) {
            particle.update(dt);
            const pos = getClientPosition(particle.x, particle.y);
            particle.render(ctx, pos.x, pos.y, Options.tileSize);
            if (particle.done) this.particles.delete(particle);
        }
    };
}