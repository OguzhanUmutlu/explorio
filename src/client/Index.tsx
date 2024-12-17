import {getServerList, getWorldList, isMobileByAgent, ReactState, useGroupState} from "@c/utils/Utils";
import React, {useState} from "react";
import {SinglePlayerPopup} from "@dom/components/indexPopups/SinglePlayerPopup";
import {MultiPlayerPopup} from "@dom/components/indexPopups/MultiPlayerPopup";
import {NewWorldPopup} from "@dom/components/indexPopups/NewWorldPopup";
import {NewServerPopup} from "@dom/components/indexPopups/NewServerPopup";
import {OptionsPopup} from "@dom/components/OptionsPopup";
import "@dom/css/index.css";
import {VersionString} from "@/Versions";

export function Index(O: {
    clientUUID: ReactState<string>
}) {
    const toggles = useGroupState(
        ["sp", "mp", "nw", "ns", "opt"] as const,
        false
    );

    const worlds = useState(() => getWorldList());
    const servers = useState(() => getServerList());

    function refreshWorlds() {
        worlds[1](getWorldList());
    }

    function refreshServers() {
        servers[1](getServerList());
    }

    const isMobile = isMobileByAgent();

    return <>
        <div className="panorama"></div>
        <div className="black-background"></div>

        <div className="main-menu">
            <div className="title">Explorio</div>
            <div className="buttons">
                <div className="singleplayer btn" onClick={() => toggles.sp[1](true)}>Singleplayer</div>
                <div className="multiplayer btn" onClick={() => toggles.mp[1](true)}>Multiplayer</div>
                <div className="options btn" onClick={() => toggles.opt[1](true)}>Options</div>
            </div>
        </div>

        <SinglePlayerPopup sp={toggles.sp} nw={toggles.nw} worlds={worlds} refresh={refreshWorlds}
                           clientUUID={O.clientUUID}/>
        <MultiPlayerPopup mp={toggles.mp} ns={toggles.ns} servers={servers} refresh={refreshServers}
                          clientUUID={O.clientUUID}/>
        <NewWorldPopup nw={toggles.nw} sp={toggles.sp} refresh={refreshWorlds}/>
        <NewServerPopup ns={toggles.ns} mp={toggles.mp} refresh={refreshServers}/>
        <OptionsPopup opt={toggles.opt} showSaveAndQuit={false} clientUUID={O.clientUUID}/>

        <div className="text-left" style={isMobile ? {fontSize: "15px"} : {}}>Explorio v{VersionString}</div>
        <div className="text-right" style={isMobile ? {fontSize: "15px"} : {}}>
            No copyright. Not affiliated with Mojang. <a href="https://github.com/OguzhanUmutlu/explorio"
                                                          target="_blank">Click for
            the source
            code!</a>
        </div>
    </>;
}