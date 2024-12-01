import {StateInput} from "@dom/components/StateInput";
import {addServer, ReactState} from "@c/utils/Utils";
import {MainMenuPopup} from "@dom/components/MainMenuPopup";
import React, {useState} from "react";

export function NewServerPopup(O: {
    ns: ReactState<boolean>,
    mp: ReactState<boolean>,
    refresh: () => void
}) {
    const popupError = useState("");

    const serverName = useState("");
    const serverIp = useState("");
    const serverPort = useState("");

    return <MainMenuPopup className="new-server-container" state={O.ns} content={<>
        <div className="mid-title">Create a server</div>
        <div className="error">{popupError[0]}</div>
        <div className="server-name">
            <StateInput state={serverName} placeholder="Server name..."/>
        </div>
        <div className="server-ip-port">
            <StateInput state={serverIp} placeholder="Server IP..."/>
            <StateInput state={serverPort} type="number" placeholder="Server port... (1881)"/>
        </div>
        <div className="create-server btn" onClick={() => {
            const name = serverName[0];
            const ip = serverIp[0];
            const port = Math.floor(+(serverPort[0] || "1881"));
            if (!name || name.length > 128 || !ip || ip.length > 128 || isNaN(port) || port <= 0 || port > 65535) {
                popupError[1]("Invalid name or IP or port");
                serverName[1]("");
                serverIp[1]("");
                serverPort[1]("");
                return;
            }

            popupError[1]("");
            serverName[1]("");
            serverIp[1]("");
            serverPort[1]("");
            addServer(name, ip, port);
            O.refresh();
            O.ns[1](false);
            O.mp[1](true);
        }}>Create server
        </div>
    </>} onClose={() => {
        serverName[1]("");
        serverIp[1]("");
        serverPort[1]("");
        popupError[1]("");
    }}/>;
}