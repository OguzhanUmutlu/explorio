import CEntity from "@c/entity/CEntity";
import ItemEntity from "@/entity/defaults/ItemEntity";
import {getClientPosition, TileSize} from "@c/utils/Utils";
import {f2data} from "@/item/ItemFactory";

export default class CItemEntity extends ItemEntity implements CEntity {
    isClient = true;
    itemFullId: number;

    getItem() {
        return f2data(this.itemFullId);
    };

    render(ctx: CanvasRenderingContext2D, dt: number) {
        super.render(ctx, dt);

        const bb = this.bb;
        const pos = getClientPosition(bb.x, bb.y);
        const s = bb.width * TileSize.value;
        this.getItem()?.renderItem(ctx, pos.x, pos.y - s, s, s, false);
    };
}