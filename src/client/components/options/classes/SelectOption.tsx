import GameOption from "@dom/components/options/classes/GameOption";
import RangeOptionComponent from "@dom/components/options/RangeOptionComponent";
import {OptionsType} from "@c/utils/Utils";
import React from "react";

export default class SelectOption extends GameOption {
    constructor(
        key: keyof OptionsType,
        name: string,
        description: string,
        public labels: string[],
        public action?: ((v: number) => void),
        public default_?: number
    ) {
        super(key, name, description);
    };

    toReact() {
        return <RangeOptionComponent option={this.key} description={this.description} min={0}
                                     max={this.labels.length - 1}
                                     step={1} text={v => `${this.name}: ${this.labels[v]}`} action={this.action}
                                     default={this.default_}/>;
    };
}