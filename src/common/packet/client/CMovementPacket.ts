import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class CMovementPacket extends Packet<CMovementPacket> {
    static packetId = PacketIds.CLIENT_MOVEMENT;
    static struct = X.object.struct({
        x: X.f32,
        y: X.f32,
        rotation: X.f32
    });
}