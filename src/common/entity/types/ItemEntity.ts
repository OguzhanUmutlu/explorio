import Entity from "@/entity/Entity";
import BoundingBox from "@/entity/BoundingBox";
import {Entities, EntityBoundingBoxes} from "@/meta/Entities";
import Item from "@/item/Item";
import Player from "@/entity/types/Player";

export default class ItemEntity extends Entity {
    typeId = Entities.ITEM;
    typeName = "item";
    name = "Item";
    bb: BoundingBox = EntityBoundingBoxes[Entities.ITEM].copy();
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
            if (this.delay <= 0 && entity instanceof Player && entity.bb.collides(this.bb)) {
                const rem = entity.addItem(source);
                if (rem === 0) this.despawn();
                else source.count = rem;
                this.world.playSound("assets/sounds/random/pop.ogg", this.x, this.y);
                return;
            }

            if (entity instanceof ItemEntity) {
                const target = entity.item;
                if (target.count > source.count && target.equals(source, false, true)) {
                    target.count += source.count;
                    entity.delay = Math.max(this.delay, entity.delay);
                    this.despawn();
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