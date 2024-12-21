import {getServerList, getWorldList, isMobileByAgent, ReactState, useGroupState} from "@c/utils/Utils";
import React, {useState} from "react";
import SinglePlayerPopup from "@dom/components/indexPopups/SinglePlayerPopup";
import MultiPlayerPopup from "@dom/components/indexPopups/MultiPlayerPopup";
import NewWorldPopup from "@dom/components/indexPopups/NewWorldPopup";
import NewServerPopup from "@dom/components/indexPopups/NewServerPopup";
import "@dom/css/index.css";
import {VersionString} from "@/Versions";
import {getMenus, OptionPages} from "@dom/components/options/Menus";

export default function Index(O: {
    clientUUID: ReactState<string>
}) {
    const toggles = useGroupState(
        ["sp", "mp", "nw", "ns"] as const,
        false
    );

    const page = useState<OptionPages>("none");

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

        <div className="main-menu" style={page[0] !== "none" ? {scale: "0"} : {}}>
            <div className="title">Explorio</div>
            <div className="buttons">
                <div className="singleplayer btn" onClick={() => toggles.sp[1](true)}>Singleplayer</div>
                <div className="multiplayer btn" onClick={() => toggles.mp[1](true)}>Multiplayer</div>
                <div className="options btn" onClick={() => page[1]("main")}>Options</div>
            </div>
        </div>

        <SinglePlayerPopup sp={toggles.sp} nw={toggles.nw} worlds={worlds} refresh={refreshWorlds}
                           clientUUID={O.clientUUID}/>
        <MultiPlayerPopup mp={toggles.mp} ns={toggles.ns} servers={servers} refresh={refreshServers}
                          clientUUID={O.clientUUID}/>
        <NewWorldPopup nw={toggles.nw} sp={toggles.sp} refresh={refreshWorlds}/>
        <NewServerPopup ns={toggles.ns} mp={toggles.mp} refresh={refreshServers}/>

        {...getMenus("index", page)}

        <div className="text-left" style={isMobile ? {fontSize: "15px"} : {}}>Explorio v{VersionString}</div>
        <div className="text-right" style={isMobile ? {fontSize: "15px"} : {}}>
            Not affiliated with Mojang. <a href="https://github.com/OguzhanUmutlu/explorio"
                                           target="_blank">Open source!</a>
        </div>
    </>;
}