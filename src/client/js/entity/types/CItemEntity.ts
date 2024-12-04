import CEntity from "@c/entity/CEntity";
import ItemEntity from "@/entity/types/ItemEntity";
import {getClientPosition, Options} from "@c/utils/Utils";
import {BM} from "@/meta/ItemIds";
import {im2f} from "@/meta/Items";

export default class CItemEntity extends ItemEntity implements CEntity {
    itemId: number;
    itemMeta: number;

    getItem() {
        return BM[im2f(this.itemId, this.itemMeta)];
    };

    render(ctx: CanvasRenderingContext2D, dt: number) {
        super.render(ctx, dt);

        const bb = this.bb;
        const pos = getClientPosition(bb.x, bb.y);
        const s = Options.tileSize / 4;
        this.getItem()?.render(ctx, pos.x, pos.y - s, s, s, false);
    };
}