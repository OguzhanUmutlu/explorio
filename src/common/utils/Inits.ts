import {initItems} from "../meta/Items";
import {PacketClasses} from "../packet/Packets";
import {PacketIds} from "../packet/PacketIds";
import {BatchPacket} from "../packet/common/BatchPacket";
import {SDisconnectPacket} from "../packet/server/SDisconnectPacket";
import {SHandshakePacket} from "../packet/server/SHandshakePacket";
import {SChunkPacket} from "../packet/server/SChunkPacket";
import {SEntityUpdatePacket} from "../packet/server/SEntityUpdatePacket";
import {SEntityRemovePacket} from "../packet/server/SEntityRemovePacket";
import {SPlaySoundPacket} from "../packet/server/SPlaySoundPacket";
import {CAuthPacket} from "../packet/client/CAuthPacket";
import {CMovementPacket} from "../packet/client/CMovementPacket";
import {SBlockUpdatePacket} from "../packet/server/SBlockUpdatePacket";
import {CStartBreakingPacket} from "../packet/client/CStartBreakingPacket";
import {CStopBreakingPacket} from "../packet/client/CStopBreakingPacket";
import {SBlockBreakingStopPacket} from "../packet/server/SBlockBreakingStopPacket";
import {SBlockBreakingUpdatePacket} from "../packet/server/SBlockBreakingUpdatePacket";
import {SendMessagePacket} from "../packet/common/SendMessagePacket";
import {PingPacket} from "../packet/common/PingPacket";

export function initPackets() {
    PacketClasses[PacketIds.BATCH] = BatchPacket;
    PacketClasses[PacketIds.PING] = PingPacket;
    PacketClasses[PacketIds.SEND_MESSAGE] = SendMessagePacket;

    PacketClasses[PacketIds.SERVER_BLOCK_BREAKING_STOP] = SBlockBreakingStopPacket;
    PacketClasses[PacketIds.SERVER_BLOCK_BREAKING_UPDATE] = SBlockBreakingUpdatePacket;
    PacketClasses[PacketIds.SERVER_BLOCK_UPDATE] = SBlockUpdatePacket;
    PacketClasses[PacketIds.SERVER_DISCONNECT] = SDisconnectPacket;
    PacketClasses[PacketIds.SERVER_HANDSHAKE] = SHandshakePacket;
    PacketClasses[PacketIds.SERVER_CHUNK] = SChunkPacket;
    PacketClasses[PacketIds.SERVER_ENTITY_UPDATE] = SEntityUpdatePacket;
    PacketClasses[PacketIds.SERVER_ENTITY_REMOVE] = SEntityRemovePacket;
    PacketClasses[PacketIds.SERVER_PLAY_SOUND] = SPlaySoundPacket;

    PacketClasses[PacketIds.CLIENT_AUTH] = CAuthPacket;
    PacketClasses[PacketIds.CLIENT_MOVEMENT] = CMovementPacket;
    PacketClasses[PacketIds.CLIENT_START_BREAKING] = CStartBreakingPacket;
    PacketClasses[PacketIds.CLIENT_STOP_BREAKING] = CStopBreakingPacket;
}

export function initCommon() {
    initItems();
    initPackets();
}