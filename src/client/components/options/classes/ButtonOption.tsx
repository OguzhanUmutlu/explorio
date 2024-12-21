import GameOption from "@dom/components/options/classes/GameOption";
import React from "react";
import OptionButtonComponent from "@dom/components/options/OptionButtonComponent";
import {ReactState} from "@c/utils/Utils";
import {OptionPages} from "@dom/components/options/Menus";

export default class ButtonOption extends GameOption {
    constructor(public title: string, public page: OptionPages, public description = "") {
        super(null, "", description);
    };

    toReact(pg: ReactState<OptionPages>): React.ReactNode {
        return <OptionButtonComponent text={this.title} action={() => pg[1](this.page)}/>;
    };
}