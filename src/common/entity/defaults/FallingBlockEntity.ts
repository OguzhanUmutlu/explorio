import BoundingBox from "@/entity/BoundingBox";
import {EntityIds} from "@/meta/Entities";
import EntityStruct from "@/structs/entity/EntityStruct";
import X from "stramp";
import Item from "@/item/Item";
import {f2id, f2meta} from "@/meta/ItemInformation";
import Entity from "@/entity/Entity";

export default class FallingBlockEntity extends Entity {
    typeId = EntityIds.FALLING_BLOCK;
    typeName = "falling_block";
    name = "Falling Block";
    saveStruct = EntityStruct.extend({
        blockFullId: X.u16,
        despawnTimer: X.f32
    });

    bb = new BoundingBox(0, 0, 0.99, 0.99);
    blockFullId: number;
    despawnTimer = 10;
    onGround = false;

    get item() {
        const fullId = this.blockFullId;
        return new Item(f2id(fullId), f2meta(fullId))
    };

    calcCacheState(): string {
        return ""; // don't update for client
    };

    getSpawnData() {
        return {
            ...super.getSpawnData(),
            vx: this.vx,
            vy: this.vy,
            blockFullId: this.blockFullId
        };
    };

    serverUpdate(dt: number) {
        if ((this.despawnTimer -= dt) <= 0) {
            this.world.dropItem(this.x, this.y, this.item);
            this.despawn();
        } else if (this.onGround) {
            if (this.blockIn.isReplaceableBy(f2id(this.blockFullId))) {
                this.world.setBlock(this.x, this.y, f2id(this.blockFullId), f2meta(this.blockFullId), true, true, true, true, false)
            } else this.world.dropItem(this.x, this.y, this.item);
            this.despawn();
        }

        super.serverUpdate(dt);
    };

    updateCollisionBox() {
        super.updateCollisionBox();
        this.bb.x = this.x - this.bb.width / 2;
        this.bb.y = this.y;
    };
}