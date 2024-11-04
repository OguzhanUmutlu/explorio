import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";

export const SEntityUpdatePacket = makePacketClass(PacketIds.SERVER_ENTITY_UPDATE, X.object.struct({
    typeId: X.u8,
    entityId: X.u32,
    props: X.object
}));