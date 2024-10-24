import {chatBox, clientNetwork, isOnline, Keyboard, Mouse} from "../../Client";
import {CPlayer} from "./CPlayer";
import {BM, I} from "../../../../common/meta/ItemIds";
import {Containers} from "../../../../common/meta/Containers";
import {ColorCodes} from "../../../../common/utils/Utils";

export class OriginPlayer extends CPlayer {
    containerId: Containers = Containers.CLOSED;
    placeTime = 0;
    name = "";

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
                    if (isOnline) clientNetwork.sendStopBreaking();
                }
            } else if (this.world.canBreakBlockAt(this, Mouse.rx, Mouse.ry)) {
                this.breaking = [Mouse.rx, Mouse.ry];
                const fullId = this.world.getBlockAt(Mouse.rx, Mouse.ry);
                // todo: handle tools
                this.breakingTime = BM[fullId].getHardness();
                if (isOnline) clientNetwork.sendStartBreaking(Mouse.rx, Mouse.ry);
            }
        } else {
            if (this.breaking && isOnline) clientNetwork.sendStopBreaking();
            this.breaking = null;
            this.breakingTime = 0;
        }
        if (Mouse.right) {
            if (this.placeTime === 0 && this.world.tryToPlaceBlockAt(this, Mouse.x, Mouse.y, I.GLASS, 0)) {
                this.placeTime = 0.3;
            }
        } else this.placeTime = 0;
    };

    sendMessage(message: string) {
        const div = document.createElement("div");
        div.classList.add("message");
        // b = bold
        // u = underline
        // s = strikethrough
        // i = italics
        // k = obfuscated
        let parent = <any>div;
        const sep = message.split(/(§[\da-fbusik]|:[a-z]+:)/);
        for (const part of sep) {
            if (/^§[\da-fbusik]$/.test(part)) {
                const dv = document.createElement("span");
                dv.classList.add("sub-message");
                parent.appendChild(dv);
                if (part[1] in ColorCodes) {
                    dv.style.color = ColorCodes[part[1]];
                } else switch (part[1]) {
                    case "b":
                        dv.style.fontWeight = "bold";
                        break;
                    case "u":
                        dv.style.textDecoration = "underline";
                        break;
                    case "s":
                        dv.style.textDecoration = "line-through";
                        break;
                    case "i":
                        dv.style.fontStyle = "italic";
                        break;
                    case "k":
                        dv.style.fontStyle = "oblique";
                        break;
                }
                parent = dv;
            } else if (/^:[a-z]+:$/.test(part) && [
                "eyes", "nerd", "skull", "slight_smile"
            ].includes(part.slice(1, -1))) {
                const emote = document.createElement("div");
                emote.classList.add("emote");
                const emotePath = `./assets/textures/emotes/${part.slice(1, -1)}.png`;
                emote.style.backgroundImage = `url(${emotePath})`;
                parent.appendChild(emote);
            } else parent.appendChild(document.createTextNode(part));
        }

        chatBox.appendChild(div);

        while (chatBox.children.length > 100) {
            chatBox.children.item(0).remove();
        }

        chatBox.scrollTop = chatBox.scrollHeight;
        requestAnimationFrame(() => div.style.translate = "0");
    };
}