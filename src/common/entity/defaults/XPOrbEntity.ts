import BoundingBox from "@/entity/BoundingBox";
import {EntityIds} from "@/meta/Entities";
import Player from "@/entity/defaults/Player";
import {registerAny} from "@/utils/Inits";
import Entity from "@/entity/Entity";
import EntityStruct from "@/structs/entity/EntityStruct";
import X from "stramp";

const maxStack = 255;

export default class XPOrbEntity extends Entity {
    static _ = registerAny(this);
    typeId = EntityIds.XP_ORB;
    typeName = "xp_orb";
    name = "XP Orb";
    saveStruct = EntityStruct.extend({
        amount: X.u8,
        delay: X.f32,
        despawnTimer: X.f32
    });

    bb = new BoundingBox(0, 0, 0.05, 0.05);
    amount: number;
    wasOnGround = false;
    delay = 0;
    despawnTimer = 5 * 60;

    calcCacheState(): string {
        return `${this.amount}`;
    };

    getSpawnData() {
        return {
            ...super.getMovementData(),
            amount: this.amount
        };
    };

    getMovementData() {
        return this.getSpawnData();
    };

    serverUpdate(dt: number) {
        for (const entity of this.getChunkEntities()) {
            if (this === entity) continue;

            if (this.delay <= 0 && entity instanceof Player && entity.bb.copy().expand(3, 1.2).collides(this.bb)) {
                entity.addXP(this.amount);
                this.despawn();
                this.world.playSound("assets/sounds/random/orb.ogg", this.x, this.y);
                return;
            }

            if (
                entity instanceof XPOrbEntity
                && this.distance(entity.x, entity.y) < 1
                && (entity.amount > this.amount || (entity.amount === this.amount && this.id > entity.id))
                && this.amount < maxStack
            ) {
                const moving = Math.min(maxStack - entity.amount, this.amount);
                entity.amount += moving;
                this.amount -= moving;
                if (this.amount <= 0) {
                    entity.delay = Math.max(this.delay, entity.delay);
                    this.despawn();
                }
                return;
            }
        }

        this.delay -= dt;
        this.despawnTimer -= dt;

        if (this.despawnTimer <= 0) return this.despawn();

        super.serverUpdate(dt);
        this.update(dt);
    };

    update(dt: number) {
        super.update(dt);

        if (this.onGround) {
            this.vx = 0;
            if (!this.wasOnGround) {
                this.broadcastMovement();
            }

            this.wasOnGround = true;
        }
    };

    updateCollisionBox() {
        super.updateCollisionBox();
        this.bb.x = this.x - this.bb.width / 2;
        this.bb.y = this.y;
    };
}