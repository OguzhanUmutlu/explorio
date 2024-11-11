import {
    addServer,
    addWorld, Div,
    getServerList,
    getWorldList, Input,
    loadOptions,
    removeServer,
    removeWorld,
    URLPrefix
} from "./utils/Utils.js";
import OptionsContainer from "../components/OptionsContainer";

loadOptions();

await OptionsContainer();

const blackBg = <Div>document.querySelector(".black-background");
const spCon = <Div>document.querySelector(".singleplayer-container");
const mpCon = <Div>document.querySelector(".multiplayer-container");
const optionsCon = <Div>document.querySelector(".options-container");
const newWorldCon = <Div>document.querySelector(".new-world-container");
const newServerCon = <Div>document.querySelector(".new-server-container");

const spBtn = <Div>document.querySelector(".singleplayer");
const mpBtn = <Div>document.querySelector(".multiplayer");
const optionsBtn = <Div>document.querySelector(".options");
const newWorldBtn = <Div>document.querySelector(".new-world");
const newServerBtn = <Div>document.querySelector(".new-server");

const createWorldBtn = <Div>document.querySelector(".create-world");
const createServerBtn = <Div>document.querySelector(".create-server");

const worldName = <Input>document.querySelector(".world-name > input");
const worldSeed = <Input>document.querySelector(".world-seed > input");

const serverName = <Input>document.querySelector(".server-name > input");
const serverIP = <Input>document.querySelector(".server-ip > input");
const serverPort = <Input>document.querySelector(".server-port > input");

const worldAddError = <Div>document.querySelector(".new-world-container > .error");
const serverAddError = <Div>document.querySelector(".new-server-container > .error");

const map = [
    [spBtn, spCon],
    [mpBtn, mpCon],
    [optionsBtn, optionsCon],
    [newWorldBtn, newWorldCon],
    [newServerBtn, newServerCon]
];

function refreshWorlds() {
    spCon.querySelector(".world-list").innerHTML = "";
    const worlds = getWorldList();
    for (let i = 0; i < worlds.length; i++) {
        const world = worlds[i];
        const div = document.createElement("div");
        div.classList.add("world");
        div.textContent = world.name;
        spCon.querySelector(".world-list").appendChild(div);

        const deleteBtn = document.createElement("div");
        deleteBtn.classList.add("delete-btn");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => {
            removeWorld(getWorldList().findIndex(i => i.uuid === world.uuid));
            refreshWorlds();
        });
        div.appendChild(deleteBtn);

        div.addEventListener("click", () => {
            if (!getWorldList().some(i => i.uuid === world.uuid)) return;
            location.href = `${URLPrefix}client.html#${world.uuid}`;
        });
    }
}

async function refreshServers() {
    mpCon.querySelector(".server-list").innerHTML = "";
    const servers = getServerList();
    const promises = [];
    for (let i = 0; i < servers.length; i++) {
        const server = servers[i];
        const div = document.createElement("div");
        div.classList.add("server");
        div.textContent = server.name;
        mpCon.querySelector(".server-list").appendChild(div);

        const deleteBtn = document.createElement("div");
        deleteBtn.classList.add("delete-btn");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => {
            removeServer(getServerList().findIndex(i => i.uuid === server.uuid));
            refreshServers();
        });
        div.appendChild(deleteBtn);

        div.addEventListener("click", () => {
            if (!getServerList().some(i => i.uuid === server.uuid)) return;
            location.href = `${URLPrefix}client.html#${server.uuid}`;
        });
    }
    await Promise.all(promises);
}

function closeContainer(con) {
    if (con === newWorldCon) {
        worldName.value = "";
        worldSeed.value = "";
        worldAddError.innerText = "";
    } else if (con === newServerCon) {
        serverName.value = "";
        serverIP.value = "";
        serverPort.value = "";
        serverAddError.innerText = "";
    }
    con.style.scale = "0";
    con.style.pointerEvents = "none";
    blackBg.style.opacity = "0";
    blackBg.style.pointerEvents = "none";
}

function openContainer(con) {
    for (const [_, con2] of map) {
        if (con === con2) continue;
        closeContainer(con2);
    }
    if (con === spCon) {
        refreshWorlds();
    }
    if (con === mpCon) {
        refreshServers().then(r => r);
    }
    con.style.scale = "1";
    con.style.pointerEvents = "auto";
    blackBg.style.opacity = "1";
    blackBg.style.pointerEvents = "auto";
}

for (const [btn, con] of map) {
    btn.addEventListener("click", () => openContainer(con));
    con.querySelector(".close-btn").addEventListener("click", () => closeContainer(con));
}

createWorldBtn.addEventListener("click", () => {
    const name = worldName.value;
    const seed = Math.floor(worldSeed.value * 1);
    if (seed <= 0 || !name || name.length > 128) {
        worldAddError.innerText = "Invalid name or seed";
        worldName.value = "";
        worldSeed.value = "";
        return;
    }

    addWorld(name, seed);

    openContainer(spCon);
});

createServerBtn.addEventListener("click", () => {
    const name = serverName.value;
    const ip = serverIP.value;
    const port = Math.floor(serverPort.value * 1);
    if (!name || name.length > 128 || !ip || ip.length > 128 || isNaN(port) || port <= 0 || port > 65535) {
        serverAddError.innerText = "Invalid name, IP or port";
        serverName.value = "";
        serverIP.value = "";
        serverPort.value = "";
        return;
    }

    addServer(name, ip, port);

    openContainer(mpCon);
});