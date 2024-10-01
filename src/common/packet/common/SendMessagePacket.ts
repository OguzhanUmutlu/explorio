import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import X from "stramp";

export class SendMessagePacket extends Packet<SendMessagePacket> {
    static packetId = PacketIds.SEND_MESSAGE;
    static struct = X.string;
}