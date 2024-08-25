import {Keyboard, Mouse} from "../Client";
import {ItemIds} from "../../../common/Items";
import {CPlayer} from "./CPlayer";
import {ContainerIds, Inventory} from "../../../common/Inventory";

export class OriginPlayer extends CPlayer {
    inventory = new Inventory(36);
    armorInventory = new Inventory(4);
    cursor = new Inventory(1);
    container = new Inventory(5);
    containerType = ContainerIds.CHEST;

    render() {
        this.renderHeadRotation = Math.atan2(Mouse.x - this.x, Mouse.y - (this.y + this.bb.height - this.bb.width)) / Math.PI * 180 - 90;
        super.render();
    };

    update(dt: number) {
        super.update(dt);

        const speed = this.walkSpeed * dt;
        const walkMultiplier = this.onGround ? 1 : 0.8;
        if ((Keyboard.w || Keyboard[" "]) && this.onGround) this.vy = this.jumpVelocity;
        if (Keyboard.a) this.tryToMove(-speed * walkMultiplier, 0);
        if (Keyboard.d) this.tryToMove(speed * walkMultiplier, 0);

        const mouseBlock = this.world.getBlockId(Mouse.x, Mouse.y);
        if (Mouse.left) {
            if (mouseBlock !== ItemIds.AIR && this.world.getBlockDepth(Mouse.x, Mouse.y) >= 3) {
                this.world.setBlock(Mouse.x, Mouse.y, 0, 0);
            }
        }
        if (Mouse.right) {
            if (mouseBlock === ItemIds.AIR && this.world.hasSurroundingBlock(Mouse.x, Mouse.y)
                && this.world.getBlockDepth(Mouse.x, Mouse.y) >= 3) {
                this.world.setBlock(Mouse.x, Mouse.y, ItemIds.GLASS, 0);
            }
        }

        this.onMovement();
    };
}