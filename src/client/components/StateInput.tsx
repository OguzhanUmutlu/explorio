import React from "react";
import {ReactState} from "@client/js/utils/Utils";

export function StateInput(o: { state: ReactState<any>, [k: string]: any }) {
    return <input {...o} value={o.state[0]} onChange={e => {
        if (o.onChange) o.onChange(e);
        o.state[1](e.target.value);
    }}/>;
}