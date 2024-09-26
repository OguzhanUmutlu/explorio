import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class PingPacket extends Packet<PingPacket> {
    static packetId = PacketIds.PING;
    static struct = X.date;
}