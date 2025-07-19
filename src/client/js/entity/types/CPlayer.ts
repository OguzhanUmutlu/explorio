import Texture from "@/utils/Texture";
import {getClientPosition, renderPlayerModel, TileSize} from "@c/utils/Utils";
import CEntity from "@c/entity/CEntity";
import Player from "@/entity/defaults/Player";
import {SteveImage} from "@dom/assets/Steve";

export function getCurrentSwing() {
    const p = 400;
    const mod = Date.now() % p;
    return (mod > p / 2 ? -1 : 1) * Math.PI / 4;
}

export default class CPlayer extends Player implements CEntity {
    isClient = true;
    skin = new Texture("", SteveImage);
    name = "";
    ws = <unknown>null;
    breakingSoundTime = 0;
    walkSoundTime = 0;

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

    lastX = 0;

    shadow = 0;

    get bodyRotation() {
        return this.renderHeadRotation > -90 && this.renderHeadRotation < 90;
    };

    renderModel(ctx: CanvasRenderingContext2D) {
        renderPlayerModel(ctx, {
            SIZE: TileSize.value,
            bbPos: getClientPosition(this.renderX - 0.25, this.renderY - 0.5),
            bb: this.bb,
            skin: this.skin.skin(),
            bodyRotation: this.bodyRotation,
            leftArmRotation: this.renderLeftArmRotation,
            leftLegRotation: this.renderLeftLegRotation,
            rightLegRotation: this.renderRightLegRotation,
            rightArmRotation: this.renderRightArmRotation,
            headRotation: this.renderHeadRotation,
            handItem: this.handItem,
            offhandItem: this.offhandItem,
            shadowOpacity: this.shadow
        });
    };

    render(ctx: CanvasRenderingContext2D, dt: number) {
        super.render(ctx, dt);
        // this.renderHeadRotation += (this.rotation - this.renderHeadRotation) / 20;

        const breaking = this.breaking;
        if (breaking) {
            const block = this.world.getBlock(breaking[0], this.breaking[1]);
            const bst = this.breakingSoundTime = Math.max(0, this.breakingSoundTime - dt);
            if (bst === 0) {
                this.world.playSound(block.randomDig(), this.breaking[0], this.breaking[1]);
                this.breakingSoundTime = 0.2;
            }
        } else this.breakingSoundTime = 0.2;

        if (this.lastX !== this.x) {
            this.walkingRemaining = 0.2;
            this.lastX = this.x;
        }
        this.swingRemaining = Math.max(0, this.swingRemaining - dt);
        this.walkingRemaining = Math.max(0, this.walkingRemaining - dt);
        this.breakingTime = Math.max(0, this.breakingTime - dt);

        this.renderHeadRotation = this.rotation;
        const bodyRotation = this.bodyRotation;
        this.renderRightArmRotation += (this.rightArmRotation - this.renderRightArmRotation) / 20;
        this.renderLeftArmRotation += (this.leftArmRotation - this.renderLeftArmRotation) / 20;
        this.renderRightLegRotation += (this.rightLegRotation - this.renderRightLegRotation) / 20;
        this.renderLeftLegRotation += (this.leftLegRotation - this.renderLeftLegRotation) / 20;
        this.shadow += (this.world.getShadowOpacity(this.x, this.y) - this.shadow) / 20;
        const isWalking = this.walkingRemaining > 0;
        const isSwinging = this.swingRemaining > 0;
        const isBreaking = this.breaking;

        if (isWalking && this.onGround && !this.isFlying) {
            this.walkSoundTime = Math.max(0, this.walkSoundTime - dt);
            if (this.walkSoundTime === 0) {
                const collision = this.getGroundBlock();
                if (collision) {
                    this.world.playSound(collision.block.randomStep(), collision.x, collision.y - 1);
                    this.walkSoundTime = 0.3;
                }
            }
        } else this.walkSoundTime = 0;

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
            const legMul = this.onGround ? 0.7 : 0.3;
            this.rightLegRotation = -f * legMul;
            this.leftLegRotation = f * legMul;
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

        this.renderModel(ctx);
    };
}