import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";

export const SBlockBreakingStopPacket = makePacketClass(PacketIds.SERVER_BLOCK_BREAKING_STOP, X.object.struct({
    entityId: X.u32
}));