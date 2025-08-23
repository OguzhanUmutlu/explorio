import {GameOption} from "@dom/components/options/classes/GameOption";
import {RangeOptionComponent} from "@dom/components/options/RangeOptionComponent";
import {OptionsType} from "@c/utils/Utils";
import React from "react";

export class NumberOption extends GameOption {
    constructor(
        key: keyof OptionsType,
        public text: string | ((v: number) => string),
        description: string,
        public min: number,
        public max: number,
        public step = 1,
        public suffix = ""
    ) {
        super(key, "", description);
    };

    toReact() {
        return <RangeOptionComponent option={this.key} description={this.description} min={this.min} max={this.max}
                                     step={this.step}
                                     text={v => {
                                         if (typeof this.text === "function") return this.text(v);
                                         return `${this.text}: ${v + this.suffix}`;
                                     }}/>;
    };
}