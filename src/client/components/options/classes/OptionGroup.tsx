import {GameOption} from "@dom/components/options/classes/GameOption";
import {ReactState} from "@c/utils/Utils";
import React from "react";
import {OptionPages} from "@dom/components/options/Menus";

export class OptionGroup extends GameOption {
    constructor(public options: GameOption []) {
        super(null, "", "");
    };

    toReact(pg: ReactState<OptionPages>): React.ReactNode {
        return <div className={this.options.length === 1 ? "option-center" : "option-split"}>
            {...this.options.map(i => i.toReact(pg))}
        </div>;
    };
}