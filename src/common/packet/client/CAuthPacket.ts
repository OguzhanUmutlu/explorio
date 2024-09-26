import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class CAuthPacket extends Packet<CAuthPacket> {
    static packetId = PacketIds.CLIENT_AUTH;
    static struct = X.object.struct({
        username: X.string,
        skin: X.string,
        protocol: X.u16
    });
}