import {ReactState} from "../Main";
import {MainMenuPopup} from "./MainMenuPopup";
import React, {useState} from "react";
import {loadOptions, Options, saveOptions} from "../js/utils/Utils";
import {saveAndQuit} from "../Client";

export function OptionsPopup(O: {
    opt: ReactState<boolean>,
    showSaveAndQuit: boolean
}) {
    loadOptions();
    const username = useState(Options.username);
    const music = useState(Options.music);
    const sfx = useState(Options.sfx);
    const cameraSpeed = useState(Options.cameraSpeed);

    return <MainMenuPopup className="options-menu" state={O.opt} content={<>
        <div className="mid-title">Options</div>
        <div className="option-list">
            <div className="option-key">Username</div>
            <div className="option-value" data-option="username">
                <input value={username[0]} maxLength={20}
                       onChange={e => {
                           username[1](Options.username = e.target.value);
                           saveOptions();
                       }}/>
            </div>

            <div className="option-key">Music</div>
            <div className="option-value" data-option="music">
                <input type="range" value={music[0]} min={0} max={100} step={1}
                       onChange={e => {
                           music[1](Options.music = +e.target.value);
                           saveOptions();
                       }}/>
                <div className="option-value-text">{music[0]}</div>
            </div>

            <div className="option-key">SFX</div>
            <div className="option-value" data-option="sfx">
                <input type="range" value={sfx[0]} min={0} max={100} step={1}
                       onChange={e => {
                           sfx[1](Options.sfx = +e.target.value);
                           saveOptions();
                       }}/>
                <div className="option-value-text">{sfx[0]}</div>
            </div>

            <div className="option-key">Camera Speed</div>
            <div className="option-value" data-option="cameraSpeed">
                <input type="range" value={cameraSpeed[0]} min={1} max={30} step={1}
                       onChange={e => {
                           cameraSpeed[1](Options.cameraSpeed = +e.target.value);
                           saveOptions();
                       }}/>
                <div className="option-value-text">{cameraSpeed[0]}</div>
            </div>
        </div>
        <div className="save-and-quit btn" hidden={!O.showSaveAndQuit} onClick={saveAndQuit}>Save and Quit</div>
    </>}/>;
}