import React from "react";
import {isMobileByAgent, ReactState} from "@c/utils/Utils";
import OptionButtonComponent from "@dom/components/options/OptionButtonComponent";
import OptionSpacingComponent from "@dom/components/options/OptionSpacingComponent";
import {OptionPages} from "@dom/components/options/Menus";

export default function OptionMenu(O: {
    title: string,
    name: OptionPages,
    page: ReactState<OptionPages>,
    back: () => void,
    children: React.ReactNode
}) {
    return <div className="options-menu" style={O.page[0] === O.name ? {} : {pointerEvents: "none", opacity: "0"}}>
        <div className="options-container" style={isMobileByAgent() ? {width: "90%"} : {}}>
            <h3>{O.title}</h3>
            {O.children}
            <OptionSpacingComponent/>
            {O.back ? <div className="option-center">
                <OptionButtonComponent text="Done" action={O.back}/>
            </div> : <></>}
        </div>
    </div>;
}