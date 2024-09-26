import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";

export class CStopBreakingPacket extends Packet<CStopBreakingPacket> {
    static packetId = PacketIds.CLIENT_STOP_BREAKING;
}