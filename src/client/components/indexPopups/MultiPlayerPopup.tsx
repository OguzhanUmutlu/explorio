import {StateInput} from "../StateInput";
import {removeServer, ServerData} from "../../js/utils/Utils";
import {MainMenuPopup} from "../MainMenuPopup";
import React, {useState} from "react";
import {ReactState} from "../../Main";
import {RequiresClientInit} from "../../Client";

export function MultiPlayerPopup(O: {
    mp: ReactState<boolean>,
    ns: ReactState<boolean>,
    servers: ReactState<ServerData[]>,
    refresh: () => void,
    clientUUID: ReactState<string>
}) {
    const serverSearch = useState("");

    return <MainMenuPopup state={O.mp} content={<>
        <div className="flex">
            <div className="search">
                <StateInput state={serverSearch} placeholder="Search..."/>
            </div>
            <div className="new-server btn" onClick={() => {
                O.ns[1](true);
                O.mp[1](false);
            }}>New server
            </div>
        </div>
        <div className="server-list">
            {O.servers[0]
                .filter(s => s.name.toLowerCase().includes(serverSearch[0].toLowerCase()))
                .map(s => <div className="server" key={s.uuid} onClick={e => {
                    if (e.target !== e.currentTarget) return;
                    RequiresClientInit.value = true;
                    location.hash = s.uuid;
                    O.clientUUID[1](s.uuid);
                }}>
                    {s.name}
                    <div className="delete-btn" onClick={() => {
                        removeServer(s.uuid);
                        O.refresh();
                    }}>Delete
                    </div>
                </div>)}
        </div>
    </>}/>;
}