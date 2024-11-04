import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";

export const SEntityRemovePacket = makePacketClass(PacketIds.SERVER_ENTITY_REMOVE, X.u32);