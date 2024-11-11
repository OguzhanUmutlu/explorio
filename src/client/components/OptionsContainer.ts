import {Div, Options, saveOptions} from "../js/utils/Utils.js";

export default async function () {
    const root = <Div>document.querySelector(".options-container");
    const blackBg = <Div>document.querySelector(".black-background");
    await fetch(`${location.origin}/explorio/components/OptionsContainer.html`)
        .then(response => response.text())
        .then(html => {
            root.innerHTML = html;
        });

    const optionDivs = Array.from(document.querySelectorAll("[data-option]"));

    for (const div of optionDivs) {
        const input = div.querySelector("input");
        input.value = Options[div.dataset.option];
        const text = div.querySelector(".option-value-text");

        const onChange = () => {
            Options[div.dataset.option] = input.value;
            saveOptions();
            if (text) text.innerText = input.value + (input.max * 1 === 100 ? "%" : "");
        };

        onChange();

        input.addEventListener("input", onChange);
        input.addEventListener("change", onChange);
    }

    root.querySelector(".close-btn").addEventListener("click", () => {
        obj.close();
    });

    const obj = {
        isOpen() {
            return root.style.scale === "1";
        },
        close() {
            root.style.scale = "0";
            root.style.pointerEvents = "none";
            blackBg.style.opacity = "0";
            blackBg.style.pointerEvents = "none";
        },
        open() {
            root.style.scale = "1";
            root.style.pointerEvents = "auto";
            blackBg.style.opacity = "1";
            blackBg.style.pointerEvents = "auto";
        },
        toggle() {
            if (obj.isOpen()) obj.close();
            else obj.open();
        }
    };
    return obj;
}