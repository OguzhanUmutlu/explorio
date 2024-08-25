import {WebSocketServer} from "ws";
import {SServer} from "./SServer";
import Printer from "fancy-printer";

function onCrash(error) {
    Printer.error("Server crashed.");
    Printer.error(error);
}

process.on("uncaughtException", onCrash);
process.on("unhandledRejection", onCrash);
process.on("SIGINT", () => {
    wss.close();
    try {
        server.close();
    } catch (e) {
        process.exit(1);
    }
});

const wss = new WebSocketServer({port: 1881});
const server = new SServer();

wss.on("connection", ws => {
    ws.on("message", data => {
        console.log(data);
    });
});