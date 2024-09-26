import {clientNetwork, isOnline, Keyboard, Mouse} from "../../Client";
import {CPlayer} from "./CPlayer";
import {BM, I} from "../../../../common/meta/ItemIds";
import {CStopBreakingPacket} from "../../../../common/packet/client/CStopBreakingPacket";
import {CStartBreakingPacket} from "../../../../common/packet/client/CStartBreakingPacket";
import {Containers} from "../../../../common/meta/Containers";

export class OriginPlayer extends CPlayer {
    containerId: Containers = Containers.CLOSED;
    placeTime = 0;

    render(dt) {
        this.placeTime = Math.max(0, this.placeTime - dt);
        this.renderX = this.x;
        this.renderY = this.y;
        this.renderHeadRotation = this.rotation = Math.atan2(Mouse.x - this.x, Mouse.y - (this.y + this.bb.height - this.bb.width)) / Math.PI * 180 - 90;
        super.render(dt);
    };

    update(dt: number) {
        super.update(dt);

        const speed = this.walkSpeed * dt;
        const walkMultiplier = this.onGround ? 1 : 0.8;
        if ((Keyboard.w || Keyboard[" "]) && this.onGround) this.vy = this.jumpVelocity;
        if (Keyboard.a) this.tryToMove(-speed * walkMultiplier, 0);
        if (Keyboard.d) this.tryToMove(speed * walkMultiplier, 0);

        if (Mouse.left) {
            if (this.breaking) {
                if (this.breaking[0] === Mouse.rx
                    && this.breaking[1] === Mouse.ry
                    && this.world.canBreakBlockAt(this, Mouse.rx, Mouse.ry)) {
                    if (this.breakingTime === 0) {
                        if (!isOnline) {
                            this.breaking = null;
                            this.world.tryToBreakBlockAt(this, Mouse.rx, Mouse.ry);
                        }
                    }
                } else {
                    this.breaking = null;
                    this.breakingTime = 0;
                    if (isOnline) clientNetwork.sendPacket(new CStopBreakingPacket(null));
                }
            } else if (this.world.canBreakBlockAt(this, Mouse.rx, Mouse.ry)) {
                this.breaking = [Mouse.rx, Mouse.ry];
                const fullId = this.world.getBlockAt(Mouse.rx, Mouse.ry);
                // todo: handle tools
                this.breakingTime = BM[fullId].getHardness();
                if (isOnline) clientNetwork.sendPacket(new CStartBreakingPacket({
                    x: Mouse.rx, y: Mouse.ry
                }));
            }
        } else {
            if (this.breaking && isOnline) clientNetwork.sendPacket(new CStopBreakingPacket(null))
            this.breaking = null;
            this.breakingTime = 0;
        }
        if (Mouse.right) {
            if (this.placeTime === 0 && this.world.tryToPlaceBlockAt(this, Mouse.x, Mouse.y, I.GLASS, 0)) {
                this.placeTime = 0.3;
            }
        } else this.placeTime = 0;
    };
}