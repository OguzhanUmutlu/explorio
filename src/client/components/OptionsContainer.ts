import {Options, saveOptions} from "../js/Utils";

export default async function () {
    const root = <HTMLDivElement>document.querySelector(".options-container");
    const blackBg = <HTMLDivElement>document.querySelector(".black-background");
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
        root.style.scale = "0";
        root.style.pointerEvents = "none";
        blackBg.style.opacity = "0";
        blackBg.style.pointerEvents = "none";
    });

    return () => {
        root.style.scale = "1";
        root.style.pointerEvents = "auto";
        blackBg.style.opacity = "1";
        blackBg.style.pointerEvents = "auto";
    };
}