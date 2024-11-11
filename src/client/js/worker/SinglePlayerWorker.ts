import * as BrowserFS from "browserfs";
import "../../../common/network/Packet";
import {PlayerNetwork} from "../../../common/network/PlayerNetwork";
import {getRandomSeed} from "../../../common/world/World";
import {Server} from "../../../common/Server";
import "fancy-printer";
import {initServerThings} from "../../../server/Utils";
import {Packets} from "../../../common/network/Packets.js";

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
    await initServerThings();
    const printer = console;
    printer.pass = console.log;
    // noinspection TypeScriptUnresolvedReference
    self.printer = printer;

    const server = new Server(bfs, `singleplayer/${uuid}`);

    if (!await server.fileExists("singleplayer")) await server.createDirectory("singleplayer");
    server.config = {
        port: 0,
        renderDistance: 3,
        defaultWorld: "default",
        defaultWorlds: {
            default: {
                name: "default",
                generator: "default",
                generatorOptions: "",
                seed: getRandomSeed()
            }
        },
        packetCompression: false
    };
    server.saveCounterMax = 3; // every 3 seconds because the player might F5 at any point in time

    console.clear();
    await server.init();

    const network = new PlayerNetwork({
        send(data: Buffer) {
            postMessage(data);
        },
        kick() {
            printer.warn("got kicked for some reason? did you kick yourself?");
        },
        close() {
            printer.warn("Pseudo-closed the pseudo-socket. What a duo...");
        }
    }, {socket: {remoteAddress: "::ffff:127.0.0.1"}});

    let first = true;
    onmessage = async ({data}) => {
        await network.processPacketBuffer(Buffer.from(data));
        if (first && network.player) {
            network.player.permissions.add("*");
            first = false;
        }
    };

    network.processCQuit = async () => {
        await server.save();
        network.sendPacket(new Packets.CQuit(null));
    };

    postMessage("hi"); // can be anything really
};