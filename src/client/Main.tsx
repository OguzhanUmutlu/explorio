import React, {ChangeEvent, useEffect, useState} from "react";
import "./css/common.css";
import {Index} from "./Index";
import {Client, RequiresClientInit, terminateClient} from "./Client";
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

export function Main() {
    const clientUUID = useState(() => {
        const hash = location.hash.substring(1);
        if (hash && isValidUUID(hash)) RequiresClientInit.value = true;
        return hash;
    });

    function onContextMenu(e: MouseEvent) {
        if (e.composedPath()[0] instanceof HTMLInputElement) return;
        e.preventDefault();
    }

    useEventListener(window, "contextmenu", onContextMenu);

    if (!clientUUID[0]) {
        terminateClient();
    }

    return <>
        {
            clientUUID[0]
                ? <Client clientUUID={clientUUID}/>
                : <Index clientUUID={clientUUID}/>
        }
    </>;
}