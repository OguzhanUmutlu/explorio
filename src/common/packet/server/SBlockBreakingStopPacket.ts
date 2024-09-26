import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class SBlockBreakingStopPacket extends Packet<SBlockBreakingStopPacket> {
    static packetId = PacketIds.SERVER_BLOCK_BREAKING_STOP;
    static struct = X.object.struct({
        entityId: X.u32
    });
}