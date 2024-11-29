import {CPlayer} from "./CPlayer";
import {Containers} from "@explorio/meta/Inventories";
import {chatBox, clientNetwork, clientPlayer, Keyboard, Mouse} from "@client/Client";
import {Options} from "../../utils/Utils";
import {Sound} from "@explorio/utils/Sound";
import {I} from "@explorio/meta/ItemIds";
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

    walkHorizontal(sign: 1 | -1, dt: number) {
        this.tryToMove(sign * (Keyboard.shift ? 2 : 1) * (this.onGround ? 1 : 0.8) * this.walkSpeed * dt, 0, dt);
    };

    placeIfCan() {
        if (this.placeTime === 0 && this.world.tryToPlaceBlockAt(this, Mouse.x, Mouse.y, I.GRASS_BLOCK, 0)) {
            clientNetwork.sendPacket(new Packets.CPlaceBlock({
                x: Math.round(Mouse.x),
                y: Math.round(Mouse.y)
            }));
            this.placeTime = this.placeCooldown;
        }
    };

    justBreaking = null; // for mobile

    update(dt: number) {
        super.update(dt);

        if ((Keyboard.w || Keyboard[" "])) this.tryToJump();
        if (Keyboard.a) this.walkHorizontal(-1, dt);
        if (Keyboard.d) this.walkHorizontal(1, dt);

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
                this.justBreaking = this.breaking = [Mouse.rx, Mouse.ry];
                const block = this.world.getBlock(Mouse.rx, Mouse.ry);
                // todo: handle tools
                this.breakingTime = block.getHardness();
                clientNetwork.sendStartBreaking(Mouse.rx, Mouse.ry);
            }
        } else {
            if (this.breaking) clientNetwork.sendStopBreaking();
            this.breaking = null;
            this.breakingTime = 0;
        }
        if (Mouse.right) this.placeIfCan();
        else this.placeTime = 0;
    };

    playSoundAt(path: string, x: number, y: number, volume = 1) {
        if (!Options.sfx) return;
        const distance = clientPlayer.distance(x, y);
        if (distance > 20) return;
        const lastVolume = volume * (1 - (distance / 20)) * Options.sfx / 100;
        Sound.play(path, lastVolume);
    };

    sendMessage(message: string) {
        if (message.includes("\n")) {
            const split = message.split("\n");
            for (let i = 0; i < split.length; i++) {
                this.sendMessage(split[i]);
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
        const sep = message.split(/(§[\da-flusik]|:[a-z]+:)/);
        for (const part of sep) {
            if (/^§§[\da-f]|§[\da-fbusik]$/.test(part)) {
                const dv = document.createElement("div");
                dv.classList.add("sub-message");
                parent.appendChild(dv);

                if (/^§[\da-f]$/.test(part)) {
                    dv.style.color = `var(--color-${part[1]})`;
                } else switch (part[1]) {
                    case "l":
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