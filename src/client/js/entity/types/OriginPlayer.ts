import CPlayer from "@c/entity/types/CPlayer";
import {Containers, InventoryName} from "@/meta/Inventories";
import {chatBox, clientNetwork, clientPlayer, Keyboard, Mouse} from "@dom/Client";
import {Options} from "@c/utils/Utils";
import Sound from "@/utils/Sound";

export default class OriginPlayer extends CPlayer {
    containerId = Containers.Closed;
    placeTime = 0;
    name = "";
    hoveringIndex = 0;
    hoveringInventory: InventoryName | null = null;

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
        this.tryToMove(
            this.isFlying
                ? sign * this.flySpeed * dt
                : sign * (Keyboard.shift ? 1.2 : 1) * (this.onGround ? 1 : 0.8) * this.walkSpeed * dt,
            0, dt);
    };

    rightClicked() {
        const handItem = this.handItem;
        if (this.placeTime <= 0) {
            if (handItem && this.world.tryToPlaceBlockAt(this, Mouse.x, Mouse.y, handItem.id, handItem.meta, Mouse.rotation)) {
                if (!this.infiniteResource) {
                    this.hotbarInventory.decreaseItemAt(this.handIndex);
                }
                clientNetwork.sendPlaceBlock(Mouse.rx, Mouse.ry, Mouse.rotation);
            } else if (this.world.canInteractBlockAt(this, Mouse.x, Mouse.y)) {
                // interact!
                clientNetwork.sendInteractBlock(Mouse.rx, Mouse.ry);
            } else return;
            this.placeTime = this.placeCooldown;
        }
    };

    justBreaking = null; // for mobile

    update(dt: number) {
        super.update(dt);

        if (this.containerId !== Containers.Closed) return;

        if (Keyboard.w || Keyboard[" "]) {
            if (this.isFlying) this.tryToMove(0, this.flySpeed * dt, dt);
            else this.tryToJump();
        }

        if (Keyboard.s && this.isFlying) this.tryToMove(0, -this.flySpeed * dt, dt);
        if (Keyboard.a) this.walkHorizontal(-1, dt);
        if (Keyboard.d) this.walkHorizontal(1, dt);
        if (this.isFlying && this.onGround && this.canToggleFly) {
            clientNetwork.sendToggleFlight();
        }

        if (Mouse.left && !Mouse.right) {
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
                this.breakingTime = block.getBreakTime(this.handItem);
                clientNetwork.sendStartBreaking(Mouse.rx, Mouse.ry);
            }
        } else {
            if (this.breaking) clientNetwork.sendStopBreaking();
            this.breaking = null;
            this.breakingTime = 0;
        }
        if (Mouse.right && !Mouse.left) this.rightClicked();
        else this.placeTime = 0;
    };

    playSoundAt(path: string, x: number, y: number, volume = 1) {
        const distance = clientPlayer.distance(x, y); // todo: handle volume options better
        if (distance > 20) return;
        const lastVolume = volume * (1 - (distance / 20)) * 0.18 * Options.master_volume / 100;
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
        let parent = div;
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

        while (chatBox.children.length > Options.chatMessageLimit) {
            chatBox.children.item(0).remove();
        }

        chatBox.scrollTop = chatBox.scrollHeight;
        requestAnimationFrame(() => div.style.translate = "0");
    };

    canBreakBlock(x = Mouse.rx, y = Mouse.ry) {
        return this.world.canBreakBlockAt(this, x, y);
    };

    canPlaceBlock(x = Mouse.rx, y = Mouse.ry, rotation = Mouse.rotation) {
        const item = this.handItem;
        if (!item) return false;
        return this.world.canPlaceBlockAt(this, x, y, item.id, item.meta, rotation)
    };

    canInteractBlock(x = Mouse.rx, y = Mouse.ry) {
        return this.world.canInteractBlockAt(this, x, y);
    };
}