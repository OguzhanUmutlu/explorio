import React from "react";
import GameOptionComponent from "@dom/components/options/GameOptionComponent";
import OptionValueText from "@dom/components/options/OptionValueText";

export default function OptionButtonComponent(O: {
    text: string;
    description?: string;
    action?: () => unknown;
    disabled?: boolean;
}) {
    return <GameOptionComponent class={O.disabled === true ? "option-btn disabled" : "option-btn"}
                                description={O.description ?? ""}
                                action={() => !O.disabled && O.action && O.action()}>
        <OptionValueText>{O.text}</OptionValueText>
    </GameOptionComponent>
}