import React from "react";
import GameOptionComponent from "@dom/components/options/GameOptionComponent";
import OptionValueText from "@dom/components/options/OptionValueText";

export default function OptionButtonComponent(O: {
    text: string;
    description?: string;
    action?: () => unknown;
}) {
    return <GameOptionComponent class="option-btn" description={O.description ?? ""}
                                action={O.action}>
        <OptionValueText>{O.text}</OptionValueText>
    </GameOptionComponent>
}