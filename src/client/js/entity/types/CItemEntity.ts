import {CEntity} from "../CEntity";
import {ItemEntity} from "../../../../common/entity/types/ItemEntity";
import {getClientPosition} from "../../utils/Utils";

export class CItemEntity extends ItemEntity implements CEntity {
    itemId: number = 0;
    itemMeta: number = 0;

    render(ctx: CanvasRenderingContext2D, dt: number) {
        super.render(ctx, dt);

        const bb = this.bb;
        const pos = getClientPosition(bb.x, bb.y);
        ctx.fillRect(pos.x, pos.y, 10, 10);
    };
}