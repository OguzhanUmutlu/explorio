import {WebSocketServer} from "ws";
import {SServer} from "./SServer";
import Printer from "fancy-printer";
import {SDisconnectPacket} from "../common/packet/server/SDisconnectPacket";
import {Packet} from "../common/packet/Packet";
import {readPacket} from "../common/packet/Packets";
import {CAuthPacket} from "../common/packet/client/CAuthPacket";
import {SPlayer} from "./entity/SPlayer";
import {SHandshakePacket} from "../common/packet/server/SHandshakePacket";
import {initServerThings} from "./Utils";
import Z from "@toondepauw/node-zstd";
import {makeZstd} from "../common/utils/Utils";

makeZstd(v => new Z.Encoder(3).encodeSync(v), b => new Z.Decoder().decodeSync(b));

Error.stackTraceLimit = 50;

Printer.makeGlobal();

printer.options.disabledTags.push("debug");
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

initServerThings();

const wss = new WebSocketServer({port: 1881});
const server = new SServer();
server.init();

wss.on("connection", ws => {
    ws.uuid = crypto.randomUUID();
    ws.player = null;

    ws.kick = function kick(reason: string) {
        server.players.delete(ws.player);
        new SDisconnectPacket({reason}).send(ws);
        ws.close();
    };

    ws.on("message", data => {
        let pk: Packet<any>;
        try {
            pk = readPacket(data);
        } catch (e) {
            printer.warn(e);
            return ws.kick("Invalid packet");
        }

        if (!ws.player) {
            if (!(pk instanceof CAuthPacket)) {
                return ws.kick("Invalid auth");
            }

            const player = ws.player = new SPlayer(ws, pk.data.name, pk.data.skin, server.defaultWorld);
            player.init();
            server.players.add(player);
            player.y = server.defaultWorld.getHighHeight(ws.player.x) + 0.5;
            player.network.sendPacket(new SHandshakePacket({
                entityId: ws.player.id,
                x: player.x,
                y: player.y
            }), true);
            player.broadcastSpawn();
        } else {
            ws.player.network.processPacket(pk);
        }
    });

    ws.on("close", () => {
        if (ws.player) {
            server.players.delete(ws.player);
            ws.player.despawn();
        }
    });
});