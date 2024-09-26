import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class SEntityRemovePacket extends Packet<SEntityRemovePacket> {
    static packetId = PacketIds.SERVER_ENTITY_REMOVE;
    static struct = X.u32;
}