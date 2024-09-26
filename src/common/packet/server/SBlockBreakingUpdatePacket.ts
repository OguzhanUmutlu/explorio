import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class SBlockBreakingUpdatePacket extends Packet<SBlockBreakingUpdatePacket> {
    static packetId = PacketIds.SERVER_BLOCK_BREAKING_UPDATE;
    static struct = X.object.struct({
        entityId: X.u32,
        time: X.f32,
        x: X.i32,
        y: X.u32
    });
}