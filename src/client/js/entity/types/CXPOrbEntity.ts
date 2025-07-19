import CEntity from "@c/entity/CEntity";
import {getClientPosition, TileSize} from "@c/utils/Utils";
import XPOrbEntity from "@/entity/defaults/XPOrbEntity";
import Texture from "@/utils/Texture";

export default class CXPOrbEntity extends XPOrbEntity implements CEntity {
    isClient = true;

    render(ctx: CanvasRenderingContext2D, dt: number) {
        super.render(ctx, dt);

        const bb = this.bb;
        const pos = getClientPosition(bb.x, bb.y);
        const s = bb.width * TileSize.value * Math.ceil(Math.log2(this.amount));
        const texture = Texture.get("assets/textures/entities/xp_orb.png");

        ctx.drawImage(texture.image, pos.x, pos.y - s, s, s);
    };
}