import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";

export const CMovementPacket = makePacketClass(PacketIds.CLIENT_MOVEMENT, X.object.struct({
    x: X.f32,
    y: X.f32,
    rotation: X.f32
}));