import {Server} from "@/Server";
import {WebSocketServer} from "ws";
import {PlayerNetwork} from "@/network/PlayerNetwork";
import {initCommon} from "@/utils/Inits";
import {SoundFiles} from "@/utils/Utils";
import path from "path";
import {Packets} from "@/network/Packets";
import * as http from "node:http";
import express from "express";
import cors from "cors";
import {fileURLToPath} from "node:url";
import {fileAsync} from "ktfile";
import {getColoredPrinter} from "@/utils/ColoredPrinter";

export class SServer extends Server {
    constructor(pt = ".") {
        super(fileAsync(pt), null);
    };

    async start() {
        const t = Date.now();

        Error.stackTraceLimit = 50;

        getColoredPrinter().makeGlobal().replaceConsole();

        const exit = async () => {
            wss.close();
            try {
                await this.close();
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

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const srcServer = fileAsync(__dirname);

        const soundPath = srcServer.to("..", "client", "assets", "sounds");
        for await(const file of srcServer.walk()) {
            SoundFiles.push(file.fullPath.substring(soundPath.fullPath.length).replaceAll("\\", "/"));
        }

        await initCommon();

        printer.info("Starting server...");
        const app = express();
        const server = http.createServer(app);
        const wss = new WebSocketServer({server});
        this.socketServer = wss;
        await this.init();
        server.listen(this.config.port);
        if (this.closed) await exit();

        let corsOrigin = this.config.corsOrigin;

        if (corsOrigin !== "*") {
            const trusted = ["https://mc.oguzhanumutlu.com"];

            if (!corsOrigin) corsOrigin = trusted;
            else if (typeof corsOrigin === "string") corsOrigin = [corsOrigin, ...trusted];
            else if (Array.isArray(corsOrigin)) corsOrigin.push(...trusted);
            corsOrigin = [...new Set(corsOrigin)];
        } else {
            printer.warn("CORS is set to '*', this is not recommended for production servers. " +
                "It allows any website to force users to join your server. " +
                "You can set it to a specific origin or an array of origins in the config file.");
        }

        if (corsOrigin) app.use(cors({origin: this.config.corsOrigin}));

        app.get("/__explorio__/description", (_, res) => {
            res.send(this.config.description);
        });

        wss.on("connection", (ws, req) => {
            const network = new PlayerNetwork(this, ws, req);
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
            // There's probably no reason to await it
            this.executeCommandLabel(this.sender, this.sender, this.sender, cmd).then(r => r);
            setTimeout(listenForTerminal);
        };

        printer.info("Server started in " + (Date.now() - t) + "ms");
        listenForTerminal().then(void 0);
    };
}