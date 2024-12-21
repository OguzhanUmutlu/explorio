import React from "react";
import {OptionsType, useOptionState} from "@c/utils/Utils";
import GameOptionComponent from "@dom/components/options/GameOptionComponent";
import OptionValueText from "@dom/components/options/OptionValueText";

export default function ToggleOptionComponent(O: {
    option: keyof OptionsType;
    description?: string;
    text?: string | ((v: boolean) => string);
}) {
    const state = useOptionState(O.option);

    return <GameOptionComponent class="option-btn" description={O.description ?? ""}
                                action={() => state[1](+!state[0])}>
        <OptionValueText>
            {typeof O.text === "function" ? O.text(!!state[0]) : O.text + (state[0] ? ": ON" : ": OFF")}
        </OptionValueText>
    </GameOptionComponent>;
}