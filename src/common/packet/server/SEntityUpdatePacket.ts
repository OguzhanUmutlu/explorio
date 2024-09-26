import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class SEntityUpdatePacket extends Packet<SEntityUpdatePacket> {
    static packetId = PacketIds.SERVER_ENTITY_UPDATE;
    static struct = X.object.struct({
        typeId: X.u8,
        entityId: X.u32,
        props: X.object
    });
}