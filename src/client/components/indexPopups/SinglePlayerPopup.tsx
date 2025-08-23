import {StateInput} from "@dom/components/StateInput";
import {ReactState, removeWorld, WorldData} from "@c/utils/Utils";
import {MainMenuPopup} from "@dom/components/MainMenuPopup";
import React, {useState} from "react";

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
                    location.hash = w.uuid;
                    O.clientUUID[1](w.uuid);
                }}>
                    {w.name}
                    <div className="delete-btn" onClick={async () => {
                        if (!confirm(`Are you sure you want to delete the world named ${w.name}?`)) return;
                        if (!confirm(`You sure? You're really deleting ${w.name}?`)) return;
                        if (!confirm(`This is the last time I'm going to ask this. Are you sure you really want to delete your world named ${w.name}?`)) return;
                        if (prompt(`Type in the name of your world you want to delete:`) !== w.name) return;
                        await removeWorld(w.uuid);
                        O.refresh();
                    }}>Delete
                    </div>
                </div>)}
        </div>
    </>}/>;
}