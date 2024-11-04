import * as BrowserFS from "browserfs";
import {Player} from "../../../common/entity/types/Player.js";
import {PlayerNetwork} from "../../../common/packet/PlayerNetwork.js";
import {getRandomSeed} from "../../../common/world/World.js";
import {Server} from "../../../common/Server.js";
import "fancy-printer";
import {ZstdInit, ZstdSimple} from "@oneidentity/zstd-js";
import {makeZstd} from "../../../common/utils/Utils.js";
import {initCommon} from "../../../common/utils/Inits.js";
import {initServerThings} from "../../../server/Utils.js";

onmessage = async ({data: uuid}) => {
    self.fsr = {};
    BrowserFS.install(self.fsr);
    await new Promise(r => BrowserFS.configure({fs: "IndexedDB", options: {}}, e => {
        if (e) console.error(e);
        else r();
    }));
    self.bfs = self.fsr.require("fs");
    const fixAsync = (fn, i = 1, j = 0) => bfs[fn + "Sync"] = (...args) => <any>new Promise(r => bfs[fn](...args, (...e) => r(e[j] ? null : e[i])));
    fixAsync("mkdir");
    fixAsync("readdir");
    fixAsync("readFile");
    fixAsync("writeFile");
    fixAsync("rm");
    fixAsync("exists", 0, 1);
    self.Buffer = self.fsr.require("buffer").Buffer;
    await ZstdInit();
    makeZstd(v => ZstdSimple.compress(v), b => ZstdSimple.decompress(b));
    initServerThings();
    const printer = console;
    printer.pass = console.log;
    // noinspection TypeScriptUnresolvedReference
    self.printer = printer;

    const server = new Server(bfs, `singleplayer/${uuid}`);

    if (!await server.fs.existsSync("singleplayer")) await server.fs.mkdirSync("singleplayer", null);
    server.config = {
        port: 0,
        "render-distance": 3,
        "default-world": "default",
        "default-worlds": {
            default: {
                name: "default",
                generator: "default",
                generatorOptions: "",
                seed: getRandomSeed()
            }
        }
    };
    server.saveCounterMax = 3; // every 3 seconds because the player might F5 at any point in time

    await server.init();

    const player = await Player.loadPlayer("singleplayer");
    player.name = "singleplayer";
    player.skin = "";
    player.network = new PlayerNetwork({
        send(data: Buffer) {
            postMessage(data);
        },
        kick() {
            console.log("got kicked for some reason? did you kick yourself?");
        },
        close() {
            console.log("Pseudo-closed the pseudo-socket. What a duo...");
        }
    }, {socket: {remoteAddress: "::ffff:127.0.0.1"}});

    onmessage = async ({data}) => {
        console.log(data)
        await player.network.processPacketBuffer(Buffer.from(data));
    };

    postMessage("hi"); // can be anything really
};