import React, {ChangeEvent, useEffect, useState} from "react";
import "./css/common.css";
import {Index} from "./Index";
import {Client, terminateClient} from "./Client";
import {isValidUUID} from "./js/utils/Utils";

export type ReactState<T> = ReturnType<typeof useState<T>>;

export function useGroupState<K extends string[], T>(names: K, default_: T) {
    const obj = {};
    for (const k of names) {
        obj[k] = useState(default_);
    }
    return obj as { [k in K[number]]: ReturnType<typeof useState<T>> };
}

export function stateChanger(state: ReactState<any>) {
    return function (e: ChangeEvent<HTMLInputElement>) {
        state[1](e.target.value);
    };
}

export function useEventListener<
    T extends Element | Window,
    K extends keyof (ElementEventMap & GlobalEventHandlersEventMap)
>(el: T, event: K, cb: (ev: (ElementEventMap & GlobalEventHandlersEventMap)[K]) => any) {
    useEffect(() => {
        el.addEventListener(event, cb);
        return () => el.removeEventListener(event, cb);
    }, [el, event, cb]);
}

export async function requestFullscreen() {
    for (const key of ["requestFullscreen", "webkitRequestFullscreen", "msRequestFullscreen"]) {
        if (document.documentElement[key]) return await document.documentElement[key]();
    }
}

export function isMobileByAgent() {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/iphone|ipod|ipad|android/i.test(userAgent)) {
        return true;
    } else if (/windows|macintosh/i.test(userAgent)) {
        return false;
    }

    return false; // unknown
}

export function Main() {
    const clientUUID = useState(() => {
        const hash = location.hash.substring(1);
        if (hash && isValidUUID(hash)) {
            return hash;
        }
        if (hash) location.hash = "";
        return "";
    });

    useEffect(() => {
        function onClick() {
            if (isMobileByAgent()) {
                // requestFullscreen().then(r => r);
            }
        }

        addEventListener("click", onClick);

        return () => {
            removeEventListener("click", onClick);
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
        <div className="rotate-message">Please rotate your device to landscape mode.</div>
        {
            clientUUID[0]
                ? <Client clientUUID={clientUUID}/>
                : <Index clientUUID={clientUUID}/>
        }
    </>;
}