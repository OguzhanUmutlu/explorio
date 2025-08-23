import {GameOption} from "@dom/components/options/classes/GameOption";
import {OptionsType} from "@c/utils/Utils";
import React from "react";
import {SelectOptionComponent} from "@dom/components/options/SelectOptionComponent";

export class SelectOption extends GameOption {
    constructor(
        key: keyof OptionsType,
        name: string,
        description: string,
        public labels: string[]
    ) {
        super(key, name, description);
    };

    toReact() {
        return <SelectOptionComponent option={this.key} description={this.description} text={this.name}
                                      labels={this.labels}/>;
    };
}