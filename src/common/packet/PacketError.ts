import {Packet} from "./Packet";

export class PacketError extends Error {
    constructor(message: string, packet: Packet<any> | Buffer) {
        super(message + ": " + (packet instanceof Packet ? JSON.stringify(packet.data) : Buffer.from(packet).toString("hex")));
    };
}