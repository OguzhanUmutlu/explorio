import {PacketError} from "./PacketError";
import {Packet} from "./Packet";

export const CurrentGameProtocol = 2;

export const PacketClasses = {};

export function readPacket<T extends Packet<any>>(buffer: Buffer): T {
    const clas = PacketClasses[buffer[0]];
    if (!clas) throw new PacketError("Invalid packet", buffer);
    return clas.read(buffer, [1]) as T;
}