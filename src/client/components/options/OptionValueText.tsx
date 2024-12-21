import React, {ReactNode} from "react";

export default function OptionValueText(O: { children: ReactNode, style?: object }) {
    return <div className="option-value-text" style={O.style} ref={el => {
        if (!el || !el.parentElement) return;
        const parentWidth = el.parentElement.getBoundingClientRect().width;
        const selfWidth = el.getBoundingClientRect().width;
        el.style.animation = parentWidth < selfWidth ? "scroll-animation 6s linear infinite" : "";
    }}>{O.children}</div>;
}