import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";

export const PingPacket = makePacketClass(PacketIds.PING, X.date);