import React, {ReactNode} from "react";
import {isMobileByAgent} from "@c/utils/Utils";

export function GameOptionComponent(O: {
    description: string;
    class: string;
    children: ReactNode;
    action?: () => unknown;
}) {
    return <div className={O.class}
                style={isMobileByAgent() ? {fontSize: "16px", height: "23px", margin: "2px"} : {}}
                onClick={() => O.action && O.action()}>{O.children}</div>;
}