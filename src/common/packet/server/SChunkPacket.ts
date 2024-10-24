import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import {ChunkExchangeStruct} from "../../utils/Utils";

export class SChunkPacket extends Packet<SChunkPacket> {
    static packetId = PacketIds.SERVER_CHUNK;
    static struct = ChunkExchangeStruct;
}