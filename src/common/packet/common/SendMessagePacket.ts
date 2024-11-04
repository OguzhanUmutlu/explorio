import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";

export const SendMessagePacket = makePacketClass(PacketIds.SEND_MESSAGE, X.string16);