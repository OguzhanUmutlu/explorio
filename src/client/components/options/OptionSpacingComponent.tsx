import React from "react";
import {isMobileByAgent} from "@c/utils/Utils";

export default function OptionSpacingComponent() {
    return <div style={isMobileByAgent() ? {} : {height: "5%"}}/>;
}