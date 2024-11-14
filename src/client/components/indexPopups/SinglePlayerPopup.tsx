import {StateInput} from "../StateInput";
import {removeWorld, WorldData} from "../../js/utils/Utils";
import {MainMenuPopup} from "../MainMenuPopup";
import React, {useState} from "react";
import {ReactState} from "../../Main";
import {RequiresClientInit} from "../../Client";

export function SinglePlayerPopup(O: {
    sp: ReactState<boolean>,
    nw: ReactState<boolean>,
    worlds: ReactState<WorldData[]>,
    refresh: () => void,
    clientUUID: ReactState<string>
}) {
    const worldSearch = useState("");

    return <MainMenuPopup state={O.sp} content={<>
        <div className="flex">
            <div className="search">
                <StateInput state={worldSearch} placeholder="Search..."/>
            </div>
            <div className="new-world btn" onClick={() => {
                O.nw[1](true);
                O.sp[1](false);
            }}>New world
            </div>
        </div>
        <div className="world-list">
            {O.worlds[0]
                .filter(w => w.name.toLowerCase().includes(worldSearch[0].toLowerCase()))
                .map(w => <div className="world" key={w.uuid} onClick={e => {
                    if (e.target !== e.currentTarget) return;
                    RequiresClientInit.value = true;
                    location.hash = w.uuid;
                    O.clientUUID[1](w.uuid);
                }}>
                    {w.name}
                    <div className="delete-btn" onClick={() => {
                        removeWorld(w.uuid);
                        O.refresh();
                    }}>Delete
                    </div>
                </div>)}
        </div>
    </>}/>;
}