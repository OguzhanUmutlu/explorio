import {StateInput} from "@dom/components/StateInput";
import {ReactState, removeServer, ServerData} from "@c/utils/Utils";
import {MainMenuPopup} from "@dom/components/MainMenuPopup";
import React, {useState} from "react";

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
                    location.hash = s.uuid;
                    O.clientUUID[1](s.uuid);
                }}>
                    {s.name}
                    <div className="delete-btn" onClick={() => {
                        if (!confirm(`Are you sure you want to delete the server named '${s.name}'?`)) return;
                        if (!confirm(`You sure? You're really deleting the server '${s.name}'?`)) return;
                        if (!confirm(`This is the last time I'm going to ask you this. Are you sure you really want to delete the server named '${s.name}' from your server list?`)) return;
                        if (prompt(`Type in the name of your server you want to delete:`) !== s.name) return;
                        removeServer(s.uuid);
                        O.refresh();
                    }}>Delete
                    </div>
                </div>)}
        </div>
    </>}/>;
}