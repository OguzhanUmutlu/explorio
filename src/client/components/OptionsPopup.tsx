import {MainMenuPopup} from "@dom/components/MainMenuPopup";
import React, {useState} from "react";
import {loadOptions, Options, ReactState, saveOptions} from "@c/utils/Utils";
import {terminateClient} from "@dom/Client";
import {UsernameRegex} from "@/utils/Utils";

export function OptionsPopup(O: {
    opt: ReactState<boolean>,
    showSaveAndQuit: boolean,
    clientUUID: ReactState<string>
}) {
    loadOptions();
    const username = useState(Options.username);
    const music = useState(Options.music);
    const sfx = useState(Options.sfx);
    const cameraSpeed = useState(Options.cameraSpeed);
    const chatLimit = useState(Options.chatLimit);
    const particles = useState(Options.particles);
    const pauseOnBlur = useState(Options.pauseOnBlur);

    return <MainMenuPopup className="options-menu" state={O.opt} content={<>
        <div className="mid-title">Options</div>
        <div className="option-list">
            <div className="option-key">Username</div>
            <div className="option-value">
                <input value={username[0]}
                       onChange={e => {
                           if (!UsernameRegex.test(e.target.value)) return;
                           username[1](Options.username = e.target.value);
                           saveOptions();
                       }}/>
            </div>

            <div className="option-key">Music</div>
            <div className="option-value">
                <input type="range" value={music[0]} min={0} max={100} step={1}
                       onChange={e => {
                           music[1](Options.music = +e.target.value);
                           saveOptions();
                       }}/>
                <div className="option-value-text">{music[0]}</div>
            </div>

            <div className="option-key">SFX</div>
            <div className="option-value">
                <input type="range" value={sfx[0]} min={0} max={100} step={1}
                       onChange={e => {
                           sfx[1](Options.sfx = +e.target.value);
                           saveOptions();
                       }}/>
                <div className="option-value-text">{sfx[0]}</div>
            </div>

            <div className="option-key">Camera Speed</div>
            <div className="option-value">
                <input type="range" value={cameraSpeed[0]} min={1} max={30} step={1}
                       onChange={e => {
                           cameraSpeed[1](Options.cameraSpeed = +e.target.value);
                           saveOptions();
                       }}/>
                <div className="option-value-text">{cameraSpeed[0]}</div>
            </div>

            <div className="option-key">Chat Message Limit</div>
            <div className="option-value">
                <input type="range" value={chatLimit[0]} min={1} max={100} step={1}
                       onChange={e => {
                           chatLimit[1](Options.chatLimit = +e.target.value);
                           saveOptions();
                       }}/>
                <div className="option-value-text">{chatLimit[0]}</div>
            </div>

            <div className="option-key">Particles</div>
            <div className="option-value">
                <input type="range" value={particles[0]} min={0} max={3} step={1}
                       onChange={e => {
                           particles[1](Options.particles = +e.target.value);
                           saveOptions();
                       }}/>
                <div className="option-value-text">{["None", "Low", "Medium", "High"][particles[0]]}</div>
            </div>

            <div className="option-key">Pause on Blur</div>
            <div className="option-value">
                <input type="range" value={pauseOnBlur[0]} min={0} max={1} step={1}
                       onChange={e => {
                           pauseOnBlur[1](Options.pauseOnBlur = +e.target.value as 0 | 1);
                           saveOptions();
                       }}/>
                <div className="option-value-text">{["Disabled", "Enabled"][pauseOnBlur[0]]}</div>
            </div>
        </div>
        <div className="save-and-quit btn" hidden={!O.showSaveAndQuit} onClick={() => {
            terminateClient();
            location.hash = "";
        }}>Save and Quit
        </div>
    </>}/>;
}