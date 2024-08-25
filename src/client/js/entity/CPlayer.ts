import {clientPlayer, ctx, getClientPosition, TILE_SIZE as BLK} from "../Client";
import {Texture} from "../Texture";
import {renderPlayerModel} from "../Utils";
import {CEntity} from "./CEntity";
import {PlayerEntity} from "../../../common/entity/PlayerEntity";

export function getCurrentSwing() {
    const p = 400;
    const mod = performance.now() % p;
    return (mod > p / 2 ? -1 : 1) * Math.PI / 2.5
}

export class CPlayer extends PlayerEntity implements CEntity {
    skin = Texture.get("./assets/steve.png");

    breaking = null;
    breakingTime = 0;
    handItem = null;

    // (head rotation)
    rotation = 0; // IN DEGREES

    // self explanatory properties:
    renderHeadRotation = 0; // IN DEGREES

    walkingRemaining = 0; // the seconds for walking to end
    swingRemaining = 0; // the seconds for hand swinging to end

    renderLeftArmRotation = 0;
    renderRightArmRotation = 0;
    renderLeftLegRotation = 0;
    renderRightLegRotation = 0;

    leftArmRotation = 0;
    rightArmRotation = 0;
    leftLegRotation = 0;
    rightLegRotation = 0;

    constructor() {
        super(null);
    };

    render() {
        ctx.strokeStyle = clientPlayer.world.getBlockCollisions(this.bb, 1).length > 0 ? "lime" : "white";
        ctx.lineWidth = 2;

        const bb = this.bb;

        // renderBoundingBox(bb);

        const bodyRotation = this.renderHeadRotation > -90 && this.renderHeadRotation < 90;
        this.renderRightArmRotation += (this.rightArmRotation - this.renderRightArmRotation) / 20;
        this.renderLeftArmRotation += (this.leftArmRotation - this.renderLeftArmRotation) / 20;
        this.renderRightLegRotation += (this.rightLegRotation - this.renderRightLegRotation) / 20;
        this.renderLeftLegRotation += (this.leftLegRotation - this.renderLeftLegRotation) / 20;

        // f(0) = 0
        // f(250) = pi / 4
        // f(500) = 0
        // f(750) = -pi / 4
        // f(1000) = 0 (period)
        const isWalking = this.walkingRemaining > 0;
        const isSwinging = this.swingRemaining > 0;
        const isBreaking = this.breaking;

        if (isWalking) {
            const f = getCurrentSwing();
            if (isSwinging) {
                this.leftArmRotation = 0;
                this.rightArmRotation = (bodyRotation ? -1 : 1) * Math.PI / 2.5;
            } else if (isBreaking) {
                this.leftArmRotation = 0;
                this.rightArmRotation = f;
            } else {
                this.leftArmRotation = f;
                this.rightArmRotation = -f;
            }
            const mul = this.onGround ? 0.7 : 0.5;
            this.rightLegRotation = -f * mul;
            this.leftLegRotation = f * mul;
        } else {
            if (isSwinging) {
                this.rightArmRotation = (bodyRotation ? -1 : 1) * Math.PI / 2.5;
            } else if (isBreaking) {
                this.rightArmRotation = Math.max(0, getCurrentSwing()) * (bodyRotation ? -1 : 1);
            } else this.rightArmRotation = 0;
            this.leftArmRotation = 0;
            this.rightLegRotation = this.leftLegRotation = 0;
        }

        const baseSkin = this.skin.skin();
        if (!baseSkin) return;

        renderPlayerModel(ctx, {
            SIZE: BLK,
            bbPos: getClientPosition(bb.x, bb.y),
            skin: baseSkin,
            bodyRotation,
            leftArmRotation: this.renderLeftArmRotation,
            leftLegRotation: this.renderLeftLegRotation,
            rightLegRotation: this.renderRightLegRotation,
            rightArmRotation: this.renderRightArmRotation,
            headRotation: this.renderHeadRotation,
            handItem: null
        });

        // const {x: cx, y: cy} = getClientPosition(this.x, this.y);
        //
        // const skin = baseSkin[this.direction];
        //
        // ctx.drawImage(skin.head,
        //     cx - bb.width / 2 * BLK,
        //     cy + (-bb.height + this.bb.width) * BLK,
        //     BLK * bb.width,
        //     BLK * bb.width
        // );
        //
        // ctx.drawImage(skin.body,
        //     cx - bb.width / 4 * BLK,
        //     cy + (-bb.height + 2 * this.bb.width) * BLK,
        //     BLK * bb.width / 2,
        //     BLK * (bb.height - bb.width) / 2
        // );
        //
        // ctx.drawImage(skin.front_leg,
        //     cx - bb.width / 4 * BLK,
        //     cy + (-bb.height + 2 * this.bb.width + ((bb.height - bb.width) / 2)) * BLK - 1,
        //     BLK * bb.width / 2,
        //     BLK * (bb.height - bb.width) / 2
        // );
    };

    onMovement() {
        this.bb.x = this.x - 0.25;
        this.bb.y = this.y - 0.5;
        super.onMovement();
    };
}