import CEntity from "$c/entity/CEntity";
import ItemEntity from "$/entity/types/ItemEntity";
import {getClientPosition} from "$c/utils/Utils";

export default class CItemEntity extends ItemEntity implements CEntity {
    itemId: number = 0;
    itemMeta: number = 0;

    render(ctx: CanvasRenderingContext2D, dt: number) {
        super.render(ctx, dt);

        const bb = this.bb;
        const pos = getClientPosition(bb.x, bb.y);
        ctx.fillRect(pos.x, pos.y, 10, 10);
    };
}