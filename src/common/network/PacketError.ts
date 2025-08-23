import {Packet} from "@/network/Packet";
import {BufferIndex} from "stramp";

export class PacketError extends Error {
    constructor(message: string, packet: Packet | Buffer | BufferIndex) {
        let str: string;
        if (packet instanceof Packet) str = JSON.stringify(packet.data);
        else {
            const buf = packet instanceof Buffer ? packet : (<BufferIndex>packet).getBuffer();
            str = buf.toString("hex");
        }
        super(message + ": " + str);
    };
}