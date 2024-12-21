import GameOption from "@dom/components/options/classes/GameOption";
import {OptionsType} from "@c/utils/Utils";
import ToggleOptionComponent from "@dom/components/options/ToggleOptionComponent";
import React from "react";

export default class ToggleOption extends GameOption {
    constructor(
        key: keyof OptionsType,
        name: string,
        description = "",
    ) {
        super(key, name, description);
    };

    toReact() {
        return <ToggleOptionComponent option={this.key} description={this.description} text={this.name}/>;
    };
}