import React from "react";
import {OptionsType, useOptionSubscription} from "@c/utils/Utils";
import GameOptionComponent from "@dom/components/options/GameOptionComponent";
import OptionValueText from "@dom/components/options/OptionValueText";

export default function SelectOptionComponent(O: {
    option: keyof OptionsType;
    labels: string[];
    description?: string;
    text?: string;
}) {
    const state = useOptionSubscription(O.option);

    return <GameOptionComponent class="option-btn" description={O.description ?? ""}
                                action={() => state[1]((+state[0] + 1) % O.labels.length)}>
        <OptionValueText>
            {O.text + ": " + O.labels[state[0] as string | number]}
        </OptionValueText>
    </GameOptionComponent>;
}