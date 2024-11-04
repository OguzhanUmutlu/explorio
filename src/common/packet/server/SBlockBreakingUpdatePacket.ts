import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";

export const SBlockBreakingUpdatePacket = makePacketClass(PacketIds.SERVER_BLOCK_BREAKING_UPDATE, X.object.struct({
    entityId: X.u32,
    time: X.f32,
    x: X.i32,
    y: X.u32
}));