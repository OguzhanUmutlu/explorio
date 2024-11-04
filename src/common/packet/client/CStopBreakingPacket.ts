import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";
import {makePacketClass} from "../Packet";

export const CStopBreakingPacket = makePacketClass(PacketIds.CLIENT_STOP_BREAKING, X.null);