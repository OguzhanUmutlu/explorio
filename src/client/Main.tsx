import React, {useEffect, useState} from "react";
import "./css/common.css";
import {Index} from "$c/../Index";
import {Client, terminateClient} from "$dom/Client";
import {getHash, isMobileByAgent, useEventListener} from "$c/utils/Utils";

export function Main() {
    const clientUUID = useState(getHash);
    const favicon = useState("./assets/logo.png");

    useEffect(() => {
        function onClick() {
            if (isMobileByAgent()) {
                // requestFullscreen().then(r => r);
            }
        }

        function handlePopState() {
            clientUUID[1](getHash());
        }

        addEventListener("popstate", handlePopState);

        addEventListener("click", onClick);

        return () => {
            removeEventListener("click", onClick);
            removeEventListener("popstate", handlePopState);
        };
    }, []);

    function onContextMenu(e: MouseEvent) {
        if (e.composedPath()[0] instanceof HTMLInputElement) return;
        e.preventDefault();
    }

    useEventListener(window, "contextmenu", onContextMenu);

    if (!clientUUID[0]) {
        terminateClient();
    }

    return <>
        <link rel="icon" href={favicon[0]}/>
        <div className="rotate-message">Please rotate your device to landscape mode.</div>
        {
            clientUUID[0]
                ? <Client clientUUID={clientUUID} favicon={favicon}/>
                : <Index clientUUID={clientUUID}/>
        }
    </>;
}