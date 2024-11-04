import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";

export const SDisconnectPacket = makePacketClass(PacketIds.SERVER_DISCONNECT, X.string16);