import {ctx, getClientPosition} from "../../Client";
import {CEntity} from "../CEntity";
import {ItemEntity} from "../../../../common/entity/types/ItemEntity";

export class CItemEntity extends ItemEntity implements CEntity {
    itemId: number = 0;
    itemMeta: number = 0;

    render(dt) {
        super.render(dt);

        const bb = this.bb;
        const pos = getClientPosition(bb.x, bb.y);
        ctx.fillRect(pos.x, pos.y, 10, 10);
    };
}