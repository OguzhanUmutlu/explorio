import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class SHandshakePacket extends Packet<SHandshakePacket> {
    static packetId = PacketIds.SERVER_HANDSHAKE;
    static struct = X.object.struct({
        entityId: X.u32,
        x: X.f32, y: X.f32
    });
}