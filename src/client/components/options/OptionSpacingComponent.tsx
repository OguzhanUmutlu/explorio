import React from "react";
import {isMobileByAgent} from "@c/utils/Utils";

export function OptionSpacingComponent() {
    return <div style={isMobileByAgent() ? {} : {height: "5%"}}/>;
}