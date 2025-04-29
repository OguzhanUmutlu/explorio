import React from "react";
import {DefaultOptions, OptionsType, useOptionSubscription} from "@c/utils/Utils";
import GameOptionComponent from "@dom/components/options/GameOptionComponent";

export default function InputOptionComponent(O: {
    option: keyof OptionsType;
    description?: string;
    text?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}) {
    const state = useOptionSubscription(O.option);

    return <GameOptionComponent class="option-input" description={O.description ?? ""}>
        <label>{O.text}</label>: <input placeholder={DefaultOptions[O.option].toString()} value={state[0]}
                                        onChange={e => {
                                            if (e.target.value.length < O.minLength) return;
                                            state[1](typeof state[0] === "number" ? +e.target.value : e.target.value);
                                        }} type={typeof state[0] === "number" ? "number" : "text"}
                                        maxLength={O.maxLength}
                                        min={O.min} max={O.max}/>
    </GameOptionComponent>;
}