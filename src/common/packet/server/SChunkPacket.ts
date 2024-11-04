import {makePacketClass} from "../Packet";
import {PacketIds} from "../../meta/PacketIds.js";
import X from "stramp";
import {SEntityUpdatePacket} from "./SEntityUpdatePacket";
import {ChunkBlocksBin} from "../../utils/Bins";

export const SChunkPacket = makePacketClass(PacketIds.SERVER_CHUNK, X.object.struct({
    x: X.i32,
    data: ChunkBlocksBin,
    entities: X.array.typed(SEntityUpdatePacket.struct),
    resetEntities: X.bool
}));