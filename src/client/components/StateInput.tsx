import React, {ChangeEvent} from "react";
import {ReactState} from "@c/utils/Utils";

export function StateInput(o: {
    state: ReactState<string | number>,
    onChange?: (e: ChangeEvent) => void,
    [k: string]: unknown
}) {
    return <input {...o} value={o.state[0]} onChange={e => {
        if (o.onChange) o.onChange(e);
        o.state[1](e.target.value);
    }}/>;
}