import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";
import {makePacketClass} from "../Packet";

export const CAuthPacket = makePacketClass(PacketIds.CLIENT_AUTH, X.object.struct({
    name: X.string8,
    skin: X.string16,
    protocol: X.u16
}));