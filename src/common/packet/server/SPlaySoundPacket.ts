import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class SPlaySoundPacket extends Packet<SPlaySoundPacket> {
    static packetId = PacketIds.SERVER_PLAY_SOUND;
    static struct = X.object.struct({
        x: X.f32,
        y: X.f32,
        path: X.string
    });
}