import {CPlayer} from "./CPlayer";
import {I} from "@explorio/meta/ItemIds";
import {Containers} from "@explorio/meta/Inventories";
import {chatBox, clientNetwork, Keyboard, Mouse} from "@client/Client";
import {Options} from "../../utils/Utils";
import {Packets} from "@explorio/network/Packets";

export class OriginPlayer extends CPlayer {
    containerId = Containers.Closed;
    placeTime = 0;
    name = "";

    teleport(x: number, y: number) {
        super.teleport(x, y, false);
    };

    render(ctx: CanvasRenderingContext2D, dt: number) {
        this.placeTime = Math.max(0, this.placeTime - dt);
        this.renderX = this.x;
        this.renderY = this.y;
        this.renderHeadRotation = this.rotation = this.getRotationTowards(Mouse.x, Mouse.y);
        super.render(ctx, dt);
    };

    update(dt: number) {
        super.update(dt);

        const speed = this.walkSpeed * dt * (Keyboard.shift ? 2 : 1);
        const walkMultiplier = this.onGround ? 1 : 0.8;
        if ((Keyboard.w || Keyboard[" "]) && this.onGround) this.vy = this.jumpVelocity;
        if (Keyboard.a) this.tryToMove(-speed * walkMultiplier, 0, dt);
        if (Keyboard.d) this.tryToMove(speed * walkMultiplier, 0, dt);

        if (Mouse.left) {
            if (this.breaking) {
                if (this.breaking[0] !== Mouse.rx
                    || this.breaking[1] !== Mouse.ry
                    || !this.world.canBreakBlockAt(this, Mouse.rx, Mouse.ry)) {
                    this.breaking = null;
                    this.breakingTime = 0;
                    clientNetwork.sendStopBreaking();
                }
            } else if (this.world.canBreakBlockAt(this, Mouse.rx, Mouse.ry)) {
                this.breaking = [Mouse.rx, Mouse.ry];
                const block = this.world.getBlock(Mouse.rx, Mouse.ry);
                // todo: handle tools
                this.breakingTime = block.getHardness();
                if (this.instantBreak) this.breakingTime = 0;
                clientNetwork.sendStartBreaking(Mouse.rx, Mouse.ry);
            }
        } else {
            if (this.breaking) clientNetwork.sendStopBreaking();
            this.breaking = null;
            this.breakingTime = 0;
        }
        if (Mouse.right) {
            if (this.placeTime === 0 && this.world.tryToPlaceBlockAt(this, Mouse.x, Mouse.y, I.GLASS, 0)) {
                clientNetwork.sendPacket(new Packets.CPlaceBlock({
                    x: Mouse.x,
                    y: Mouse.y
                }));
                this.placeTime = this.placeCooldown;
            }
        } else this.placeTime = 0;
    };

    sendMessage(message: string) {
        if (message.includes("\n")) {
            for (const msg of message.split("\n")) {
                this.sendMessage(msg);
            }
            return;
        }
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
            if (/^§§[\da-f]|§[\da-fbusik]$/.test(part)) {
                const dv = document.createElement("div");
                dv.classList.add("sub-message");
                parent.appendChild(dv);

                if (/^§[\da-f]$/.test(part)) {
                    dv.style.color = `var(--color-${part[1]})`;
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
            } else {
                parent.appendChild(document.createTextNode(part));
            }
        }

        chatBox.appendChild(div);

        while (chatBox.children.length > Options.chatLimit) {
            chatBox.children.item(0).remove();
        }

        chatBox.scrollTop = chatBox.scrollHeight;
        requestAnimationFrame(() => div.style.translate = "0");
    };
}