import CEntity from "@c/entity/CEntity";
import {getClientPosition, TileSize} from "@c/utils/Utils";
import FallingBlockEntity from "@/entity/defaults/FallingBlockEntity";
import {f2data} from "@/item/ItemFactory";

export default class CFallingBlockEntity extends FallingBlockEntity implements CEntity {
    isClient = true;

    getBlock() {
        return f2data(this.blockFullId);
    };

    render(ctx: CanvasRenderingContext2D, dt: number) {
        super.render(ctx, dt);

        const bb = this.bb;
        const pos = getClientPosition(bb.x, bb.y);
        const s = bb.width * TileSize.value;
        this.getBlock()?.renderBlock(ctx, this.world, this.x, pos.x, pos.y - s, s, s, false);
    };
}