import {clientPlayer, resetKeyboard} from "../Client.js";
import {Inventory} from "../../../common/item/Inventory.js";
import {Div} from "./Utils.js";
import {Canvas} from "../../../common/utils/Texture.js";

type ItemElement = { self: Div, image: Canvas, count: Div };
type InventoryItem = { root: Div, items: ItemElement[], inventory: Inventory };

let blurDiv: Div;
let divs: Div[];
let divChildren: InventoryItem[] = [];
let inventoryHandler: ContainerToggler;

export function getInventoryHandler() {
    return inventoryHandler ??= new ContainerToggler(document.querySelector(".player-inventory-container"));
}

export function initContainerDivs() {
    blurDiv = <Div>document.querySelector(".background-blur");
    divs = <Div[]>document.querySelectorAll("[data-inventory]");
    for (const div of divs) {
        const inventory = <Inventory>clientPlayer[div.dataset.inventory];
        const r: InventoryItem = {root: div, items: [], inventory: inventory};
        for (let i = 0; i < inventory.size; i++) {
            const el = document.createElement("div");
            el.className = "inventory-item";
            div.appendChild(el);

            const image = document.createElement("canvas");
            image.width = 16;
            image.height = 16;
            const count = document.createElement("div");

            el.appendChild(image);
            el.appendChild(count);

            r.items.push({
                self: el,
                image,
                count
            });
        }
        divChildren.push(r);
    }
}

export function animateContainers() {
    for (const div of divChildren) {
        const container = div.inventory;
        const items = div.items;

        if (container.cleanDirty) for (const item of items) {
            item.image.style.background = "transparent";
            item.count.innerText = "";
        }

        if (container.dirtyIndexes.size) for (const index of container.dirtyIndexes) {
            const item = div.inventory.get(index);
            const itemElement = <ItemElement>items[index];

            item.render(itemElement.image);
            itemElement.count.innerText = item.count.toString();
        }
    }

    for (const div of divChildren) {
        const container = div.inventory;
        container.cleanDirty = false;
        container.dirtyIndexes.clear();
    }
}

export class ContainerToggler {
    static divMap = <Map<Div, ContainerToggler>>new Map;

    static closeAll() {
        for (const toggler of this.divMap.values()) {
            toggler.close();
        }
    };

    static isBlurOn() {
        return blurDiv.style.opacity === "1";
    };

    constructor(public div: Div, public bg = div.querySelector(".container-background")) {
        if (ContainerToggler.divMap.has(div)) return ContainerToggler.divMap.get(div);

        ContainerToggler.divMap.set(div, this);
    };

    open() {
        ContainerToggler.closeAll();
        this.div.style.opacity = "1";
        this.div.style.pointerEvents = "auto";
        blurDiv.style.opacity = "1";
        blurDiv.style.pointerEvents = "auto";
        resetKeyboard();
    };

    close() {
        this.div.style.opacity = "0";
        this.div.style.pointerEvents = "none";
        blurDiv.style.opacity = "0";
        blurDiv.style.pointerEvents = "none";
    };

    get on() {
        return this.div.style.opacity === "1";
    };

    toggle() {
        if (this.on) this.close();
        else this.open();
    };
}