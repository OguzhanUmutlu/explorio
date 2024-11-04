import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";

export const SBlockUpdatePacket = makePacketClass(PacketIds.SERVER_BLOCK_UPDATE, X.object.struct({
    x: X.i32,
    y: X.u32,
    fullId: X.u16
}));