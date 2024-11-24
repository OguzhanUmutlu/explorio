import React, {ReactNode} from "react";
import {ReactState} from "@client/js/utils/Utils";

export function MainMenuPopup(o: {
    state: ReactState<boolean>,
    content: ReactNode,
    className?: string,
    onClose?: () => void
}) {
    return <div className={`container ${o.className ?? ""}`}
                style={o.state[0] ? {scale: "1", pointerEvents: "auto"} : {}}>
        <div className="close-btn" onClick={() => {
            o.state[1](false);
            if (o.onClose) o.onClose();
        }}>x
        </div>
        {o.content}
    </div>
}