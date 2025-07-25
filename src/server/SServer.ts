import Server from "@/Server";
import {WebSocketServer} from "ws";
import Printer from "fancy-printer";
import PlayerNetwork from "@/network/PlayerNetwork";
import * as fs from "fs";
import {initCommon} from "@/utils/Inits";
import {readdirRecursive, SoundFiles} from "@/utils/Utils";
import path from "path";
import {fileURLToPath} from "node:url";
import {Packets} from "@/network/Packets";

export default class SServer extends Server {
    constructor(public fs: typeof import("fs"), public path: string) {
        super(fs, path, null);
    };

    async start() {
        const t = Date.now();

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        Error.stackTraceLimit = 50;

        Printer.brackets.makeGlobal().replaceConsole();

        const addStyles = (printer: typeof Printer) => {
            printer.options.allowSubstitutions = true;
            printer.removeAllSubstitutions();
            const colors = {
                0: "000000",
                1: "0000AA",
                2: "00AA00",
                3: "00AAAA",
                4: "AA0000",
                5: "AA00AA",
                6: "FFAA00",
                7: "AAAAAA",
                8: "555555",
                9: "5555FF",
                a: "55FF55",
                b: "55FFFF",
                c: "FF5555",
                d: "FF55FF",
                e: "FFFF55",
                f: "FFFFFF"
            };

            for (const k in colors) printer.addStyle("§" + k, `color: #${colors[k]}`);
            for (const k in colors) printer.addStyle("§§" + k, `background-color: #${colors[k]}`);

            printer.addStyle("§l", "font-weight: bold");
            printer.addStyle("§u", "text-decoration: underline");
            printer.addStyle("§s", "text-decoration: strike-through");
            printer.addStyle("§i", "font-style: italic");
            printer.addStyle("§k", "font-style: oblique");
            printer.addStyle("§r", "color: white; background-color: none; font-weight: normal; font-style: normal");
            printer.addStyle("&t", p => "color: " + p.options.currentTag.textColor);
        };

        addStyles(printer);

        const exit = () => {
            wss.close();
            try {
                this.close();
            } catch (e) {
                printer.error("Got an error while closing the server. Terminating the process anyways.");
                printer.error(e);
            }
            process.exit(1);
        };

        const onCrash = (error: Error) => {
            printer.error("Server crashed.");
            printer.error(error);
            exit();
        };

        process.on("uncaughtException", onCrash);
        process.on("unhandledRejection", onCrash);
        process.on("SIGINT", exit);

        const soundPath = path.resolve(`${__dirname}/../client/assets/sounds`);
        SoundFiles.push(...readdirRecursive(fs, soundPath)
            .map(i => i.replaceAll("\\", "/").substring(soundPath.length - "assets/sounds".length)));

        await initCommon();

        printer.info("Starting server...");
        const wss = new WebSocketServer({port: 1881});
        this.socketServer = wss;
        this.init();
        if (this.closed) exit();

        wss.on("connection", (ws, req) => {
            const network = new PlayerNetwork(ws, req);
            network.sendPacket(new Packets.SPreLoginInformation({
                auth: this.config.auth
            }), true);

            ws.on("message", data => network.processPacketBuffer(<Buffer>data));
            ws.on("close", () => network.onClose());
        });

        const listenForTerminal = async () => {
            const cmd = await printer.readline("> ", {allowClear: true, history: this.terminalHistory});
            if (!cmd) return exit();
            this.terminalHistory.push(cmd);
            this.executeCommandLabel(this.sender, this.sender, this.sender, cmd);
            setTimeout(listenForTerminal);
        };

        printer.info("Server started in " + (Date.now() - t) + "ms");
        listenForTerminal().then(void 0);
    };
}