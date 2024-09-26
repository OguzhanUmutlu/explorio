import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class CStartBreakingPacket extends Packet<CStartBreakingPacket> {
    static packetId = PacketIds.CLIENT_START_BREAKING;
    static struct = X.object.struct({
        x: X.i32,
        y: X.u32
    });
}