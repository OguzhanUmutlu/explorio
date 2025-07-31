import StateInput from "@dom/components/StateInput";
import {fetchMotd, formatDivText, ReactState, removeServer, ServerData} from "@c/utils/Utils";
import MainMenuPopup from "@dom/components/MainMenuPopup";
import React, {useState} from "react";

let fetching = {};
let fetched = {};

export default function MultiPlayerPopup(O: {
    mp: ReactState<boolean>,
    ns: ReactState<boolean>,
    servers: ReactState<ServerData[]>,
    refresh: () => void,
    clientUUID: ReactState<string>
}) {
    const serverSearch = useState("");
    const refresh = useState(0);

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
            <div className="new-server btn" onClick={() => {
                fetched = {};
                fetching = {};
                refresh[1](r => r + 1);
            }}>Refresh
            </div>
        </div>
        <div className="server-list">
            {O.servers[0]
                .filter(s => s.name.toLowerCase().includes(serverSearch[0].toLowerCase()))
                .map(s => {
                    if (!fetched[s.uuid] && !fetching[s.uuid]) {
                        fetching[s.uuid] = true;
                        fetchMotd(s.ip, s.port).then(r => {
                            fetched[s.uuid] = r;
                            delete fetching[s.uuid];
                            refresh[1](r => r + 1);
                        });
                    }

                    return <div className="server" key={s.uuid} onClick={e => {
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
                        <div className="motd" ref={el => {
                            const text = fetching[s.uuid] ? "§7Loading..." : fetched[s.uuid];
                            if (el) {
                                for (const child of Array.from(el.childNodes)) child.remove();
                                formatDivText(el, text);
                            }
                        }}></div>
                    </div>;
                })}
        </div>
    </>}/>;
}