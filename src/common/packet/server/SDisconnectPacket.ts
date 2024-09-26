import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class SDisconnectPacket extends Packet<SDisconnectPacket> {
    static packetId = PacketIds.SERVER_DISCONNECT;
    static struct = X.object.struct({reason: X.string});
}