import GameOption from "@dom/components/options/classes/GameOption";
import {ReactState} from "@c/utils/Utils";
import React from "react";
import {OptionPages} from "@dom/components/options/Menus";

export default class JSXOption extends GameOption {
    constructor(
        public component: (pg: ReactState<OptionPages>) => React.ReactNode
    ) {
        super(null, "", "");
    };

    toReact(pg: ReactState<OptionPages>) {
        return this.component(pg);
    };
}