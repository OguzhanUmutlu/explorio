import GameOption from "@dom/components/options/classes/GameOption";
import {OptionsType} from "@c/utils/Utils";
import React from "react";
import InputOptionComponent from "@dom/components/options/InputOptionComponent";

export default class InputOption extends GameOption {
    constructor(
        key: keyof OptionsType,
        name: string,
        description: string,
        public minLength?: number,
        public maxLength?: number,
        public min?: number,
        public max?: number
    ) {
        super(key, name, description);
    };

    toReact() {
        return <InputOptionComponent option={this.key} description={this.description} text={this.name}
                                     minLength={this.minLength} maxLength={this.maxLength} min={this.min}
                                     max={this.max}/>;
    };
}