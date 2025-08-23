import React, {ReactNode} from "react";

export function OptionValueText(O: { children: ReactNode, style?: object }) {
    return <div className="option-value-text" style={O.style} ref={el => {
        if (!el || !el.parentElement) return;
        const parentWidth = el.parentElement.getBoundingClientRect().width;
        const selfWidth = el.getBoundingClientRect().width;

        if (parentWidth < selfWidth) {
            el.style.left = "5px";
        }

        el.parentElement.onmouseenter = () => {
            el.style.animation = parentWidth < selfWidth ? "scroll-animation 2s linear infinite" : "";
        };

        el.parentElement.onmouseleave = () => {
            el.style.animation = "";
        };
    }}>{O.children}</div>;
}