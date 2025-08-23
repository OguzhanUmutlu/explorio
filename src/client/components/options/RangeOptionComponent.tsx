import React, {useState} from "react";
import {isMobileByAgent, OptionsType, useOptionSubscription} from "@c/utils/Utils";
import GameOptionComponent from "@dom/components/options/GameOptionComponent";
import OptionValueText from "@dom/components/options/OptionValueText";

export default function RangeOptionComponent(O: {
    option: keyof OptionsType;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    text?: string | ((v: number) => string);
    action?: ((v: number) => void);
    default?: number;
}) {
    const state = O.action instanceof Function ? useState(O.default) : useOptionSubscription(O.option);

    return <GameOptionComponent class="option-input" description={O.description ?? ""}>
        <input type="range" min={O.min} max={O.max} step={O.step} value={state[0] as number} onChange={e => {
            state[1](+e.target.value);
            if (O.action) O.action(+e.target.value);
        }}/>
        <OptionValueText style={isMobileByAgent() ? {fontSize: "16px"} : {}}>
            {typeof O.text === "function" ? O.text(+state[0]) : O.text + state[0]}
        </OptionValueText>
    </GameOptionComponent>;
}