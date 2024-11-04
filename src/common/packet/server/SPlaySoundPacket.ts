import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";

export const SPlaySoundPacket = makePacketClass(PacketIds.SERVER_PLAY_SOUND, X.object.struct({
    x: X.f32,
    y: X.f32,
    path: X.string16
}));