import {Packet} from "./Packet";

export class PacketError extends Error {
    constructor(message: string, packet: Packet<any> | Buffer) {
        super(message + ": " + JSON.stringify(packet));
    };
}