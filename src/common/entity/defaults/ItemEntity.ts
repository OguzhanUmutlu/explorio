import Entity from "@/entity/Entity";
import BoundingBox from "@/entity/BoundingBox";
import {EntityIds, EntityBoundingBoxes} from "@/meta/Entities";
import Item from "@/item/Item";
import Player from "@/entity/defaults/Player";

const maxStack = 255;

export default class ItemEntity extends Entity {
    typeId = EntityIds.ITEM;
    typeName = "item";
    name = "Item";
    bb: BoundingBox = EntityBoundingBoxes[EntityIds.ITEM].copy();
    item: Item;
    wasOnGround = false;
    delay = 0;
    despawnTimer = 5 * 60;

    calcCacheState(): string {
        return "";
    };

    getSpawnData() {
        return {
            ...super.getSpawnData(),
            vx: this.vx,
            vy: this.vy,
            itemId: this.item.id,
            itemMeta: this.item.meta
        };
    };

    serverUpdate(dt: number) {
        const source = this.item;
        for (const entity of this.getChunkEntities()) {
            if (this === entity) continue;

            if (this.delay <= 0 && entity instanceof Player && entity.bb.copy().expand(3, 1.2).collides(this.bb)) {
                const rem = entity.addItem(source);
                const alr = source.count;
                source.count = rem;
                if (rem === 0) this.despawn();
                if (rem === alr) return;
                this.world.playSound("assets/sounds/random/pop.ogg", this.x, this.y);
                return;
            }

            if (entity instanceof ItemEntity && this.distance(entity.x, entity.y) < 1) {
                const target = entity.item;
                if (
                    (target.count > source.count || (target.count === source.count && this.id > entity.id))
                    && target.equals(source, false, true)
                    && target.count < maxStack
                ) {
                    const moving = Math.min(maxStack - target.count, source.count);
                    target.count += moving;
                    source.count -= moving;
                    if (source.count <= 0) {
                        entity.delay = Math.max(this.delay, entity.delay);
                        this.despawn();
                    }
                    return;
                }
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