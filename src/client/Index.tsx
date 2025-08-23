import {
    getServerList,
    getWorldList,
    isMobileByAgent,
    Options,
    ReactState,
    renderPlayerModel,
    saveOptions,
    useGroupState,
    useOptionSubscription,
    useSubscription
} from "@c/utils/Utils";
import React, {useEffect, useRef, useState} from "react";
import {SinglePlayerPopup} from "@dom/components/indexPopups/SinglePlayerPopup";
import {MultiPlayerPopup} from "@dom/components/indexPopups/MultiPlayerPopup";
import {NewWorldPopup} from "@dom/components/indexPopups/NewWorldPopup";
import {NewServerPopup} from "@dom/components/indexPopups/NewServerPopup";
import "@dom/css/index.css";
import {VersionString} from "@/Versions";
import {getMenus, OptionPages, TokenCookieName, UsernameCookieName} from "@dom/components/options/Menus";
import {Texture} from "@/utils/Texture";
import {SteveDataURL} from "@dom/assets/Steve";
import {BoundingBox} from "@/entity/BoundingBox";
import {getCookie} from "@dom/components/CookieHandler";

export function Index(O: {
    clientUUID: ReactState<string>
}) {
    useSubscription("loggedIn");

    const toggles = useGroupState(
        ["sp", "mp", "nw", "ns"] as const,
        false
    );

    const page = useState<OptionPages>("none");
    const username = useOptionSubscription("fallbackUsername");

    const worlds = useState(() => getWorldList());
    const servers = useState(() => getServerList());

    const token = getCookie(TokenCookieName);
    const tokenUsername = getCookie(UsernameCookieName);

    function refreshWorlds() {
        worlds[1](getWorldList());
    }

    function refreshServers() {
        servers[1](getServerList());
    }

    const isMobile = isMobileByAgent();

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrame = useRef<number | null>(null);

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;

        el.width = 150;
        el.height = 320;
        const ctx = el.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        let skinValue = Options.skin || SteveDataURL;
        let img = new Image();
        img.src = skinValue;
        let texture = new Texture("", img);
        let mx = 0;
        let my = 0;

        const updateMouse = (e: MouseEvent) => {
            mx = e.clientX;
            my = e.clientY;
        };

        addEventListener("mousemove", updateMouse);

        async function render() {
            animationFrame.current = requestAnimationFrame(render);
            if (!el.parentElement) return;

            document.documentElement.style.setProperty("--blur", `${Options.blur_px}px`);

            ctx.clearRect(0, 0, el.width, el.height);

            if (skinValue !== Options.skin) {
                skinValue = Options.skin || SteveDataURL;
                img = new Image();
                const promise = new Promise(r => img.onload = r);
                img.src = skinValue;
                texture = new Texture("", img);
                await promise;
            }

            if (texture.image.width === 0 || texture.image.height === 0) return;

            const size = 150;
            const bb = new BoundingBox(0, 0, 0.5, 1.8);
            const box = el.getBoundingClientRect();

            const cx = box.left + box.width / 2;
            const cy = box.top + box.height - size * (bb.height - 0.25);

            const headRotation = Math.atan2(my - cy, mx - cx) * 180 / Math.PI;
            const bodyRotation = headRotation > -90 && headRotation < 90;


            renderPlayerModel(ctx, {
                SIZE: size,
                bbPos: {x: el.width / 2 - bb.width / 2 * size, y: el.height},
                bb,
                skin: texture.skin(),
                bodyRotation,
                leftArmRotation: 0,
                leftLegRotation: 0,
                rightLegRotation: 0,
                rightArmRotation: 0,
                headRotation,
                handItem: null,
                offhandItem: null,
                shadowOpacity: 0
            });

            // ctx.fillRect(cx - box.left - 5, cy - box.top - 5, 10, 10);
        }

        render().then(r => r);

        return () => {
            removeEventListener("mousemove", updateMouse);
            if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
        };
    }, []);

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

        <div className="player-info" style={page[0] !== "none" ? {scale: "0"} : {}}>
            <div className="player-name">{token && tokenUsername ? tokenUsername : username[0]}</div>
            <div className="skin">
                <canvas ref={canvasRef}></canvas>
            </div>
            <div className="upload-skin btn" onClick={async () => {
                // @ts-expect-error showOpenFilePicker is defined?
                const fileHandles: FileSystemFileHandle[] = await showOpenFilePicker({
                    types: [{
                        accept: {
                            "image/png": [".png"],
                            "image/jpeg": [".jpg", ".jpeg"],
                            "image/webp": [".webp"]
                        }
                    }],
                    multiple: false
                });

                if (!fileHandles || !fileHandles.length) return;

                const file = await fileHandles[0].getFile();

                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    Options.skin = reader.result as string;
                    saveOptions();
                };
            }}>Upload Skin
            </div>
        </div>

        <div className="text-left" style={isMobile ? {fontSize: "15px"} : {}}>Explorio v{VersionString}</div>
        <div className="text-right" style={{
            ...(isMobile ? {fontSize: "15px"} : {}),
            zIndex: 10
        }}>
            <a href="https://github.com/OguzhanUmutlu/explorio" target="_blank">Not affiliated with Mojang.</a>
        </div>
    </>;
}