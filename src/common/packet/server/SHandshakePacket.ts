import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";

export const SHandshakePacket = makePacketClass(PacketIds.SERVER_HANDSHAKE, X.object.struct({
    entityId: X.u32,
    x: X.f32, y: X.f32
}));