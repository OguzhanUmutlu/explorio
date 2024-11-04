import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";

export const CStartBreakingPacket = makePacketClass(PacketIds.CLIENT_START_BREAKING, X.object.struct({
    x: X.i32,
    y: X.u32
}));