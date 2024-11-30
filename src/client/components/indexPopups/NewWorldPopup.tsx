import {StateInput} from "$dom/components/StateInput";
import {addWorld, ReactState} from "$c/utils/Utils";
import {MainMenuPopup} from "$dom/components/MainMenuPopup";
import {getRandomSeed} from "$/world/World";
import React, {useState} from "react";

export function NewWorldPopup(O: {
    nw: ReactState<boolean>,
    sp: ReactState<boolean>,
    refresh: () => void
}) {
    const popupError = useState("");
    const worldName = useState("");
    const worldSeed = useState("");

    return <MainMenuPopup className="new-world-container" state={O.nw} content={<>
        <div className="mid-title">Create a world</div>
        <div className="error">{popupError[0]}</div>
        <div className="world-name">
            <StateInput state={worldName} placeholder="World name..."/>
        </div>
        <div className="world-seed">
            <StateInput state={worldSeed} type="number" placeholder="World seed... (optional)"/>
        </div>
        <div className="create-world btn" onClick={() => {
            const name = worldName[0];
            const seed = Math.floor(+(worldSeed[0] || getRandomSeed()));
            if (seed <= 0 || !name || name.length > 128) {
                popupError[1]("Invalid name or seed");
                worldName[1]("");
                worldSeed[1]("");
                return;
            }

            popupError[1]("");
            worldName[1]("");
            worldSeed[1]("");
            addWorld(name, seed);
            O.refresh();
            O.nw[1](false);
            O.sp[1](true);
        }}>Create
        </div>
    </>} onClose={() => {
        worldName[1]("");
        worldSeed[1]("");
        popupError[1]("");
    }}/>;
}