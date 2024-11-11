import {WebSocketServer} from "ws";
import Printer from "fancy-printer";
import {initServerThings} from "./Utils";
import {Location} from "../common/utils/Location";
import {PlayerNetwork} from "../common/network/PlayerNetwork";
import * as fs from "fs";
import {Server} from "../common/Server";

Error.stackTraceLimit = 50;

Printer.brackets.makeGlobal();

printer.options.disabledTags.push("debug");

function addStyles(printer) {
    printer.options.styleSubstitutionsEnabled = true;
    printer.setStyleCharacter("§");
    printer.styles = {};
    printer.addStyle("0", "color: #000000");
    printer.addStyle("1", "color: #0000AA");
    printer.addStyle("2", "color: #00AA00");
    printer.addStyle("3", "color: #00AAAA");
    printer.addStyle("4", "color: #AA0000");
    printer.addStyle("5", "color: #AA00AA");
    printer.addStyle("6", "color: #FFAA00");
    printer.addStyle("7", "color: #AAAAAA");
    printer.addStyle("8", "color: #555555");
    printer.addStyle("9", "color: #5555FF");
    printer.addStyle("a", "color: #55FF55");
    printer.addStyle("b", "color: #55FFFF");
    printer.addStyle("c", "color: #FF5555");
    printer.addStyle("d", "color: #FF55FF");
    printer.addStyle("e", "color: #FFFF55");
    printer.addStyle("f", "color: #FFFFFF");
    printer.addStyle("b", "font-weight: bold");
    printer.addStyle("u", "text-decoration: underline");
    printer.addStyle("s", "text-decoration: strike-through");
    printer.addStyle("i", "font-style: italic");
    printer.addStyle("k", "font-style: oblique");
}

addStyles(printer);

printer.info("Starting server...");

function exit() {
    wss.close();
    try {
        server.close();
    } catch (e) {
    }
    process.exit(1)
}

function onCrash(error) {
    printer.error("Server crashed.");
    printer.error(error);
    exit();
}

process.on("uncaughtException", onCrash);
process.on("unhandledRejection", onCrash);
process.on("SIGINT", exit);

await initServerThings();

const wss = new WebSocketServer({port: 1881});
const server = new Server(fs, ".");
await server.init();

// todo: mobile support, desktop app support, mobile app support

wss.on("connection", (ws, req) => {
    const network = new PlayerNetwork(ws, req);
    ws.on("message", data => network.processPacketBuffer(data));
    ws.on("close", () => network.onClose());
});

const consoleLocation = new Location(0, 0, 0, server.defaultWorld);

async function listenForTerminal() {
    const cmd = await printer.readLine();
    server.executeCommandLabel(server.sender, server.sender, consoleLocation, cmd);
    setTimeout(listenForTerminal);
}

listenForTerminal().then(void 0);