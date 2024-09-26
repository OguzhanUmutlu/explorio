import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class SBlockUpdatePacket extends Packet<SBlockUpdatePacket> {
    static packetId = PacketIds.SERVER_BLOCK_UPDATE;
    static struct = X.object.struct({
        x: X.i32,
        y: X.u32,
        fullId: X.u16
    });
}