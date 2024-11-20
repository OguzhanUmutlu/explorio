import {PacketError} from "./PacketError";
import {Packet} from "./Packet";
import {getServer, zstdOptionalDecode} from "../utils/Utils";
import {PacketIds} from "../meta/PacketIds";
import X, {Bin, BufferIndex} from "stramp";
import ChunkBlocksBin from "../structs/ChunkBlocksBin";

export const CurrentGameProtocol = 2;

const EntityUpdateStruct = X.object.struct({
    typeId: X.u8,
    entityId: X.u32,
    props: X.object
});

const BatchStruct = new class BatchStruct extends Bin<Packet[]> {
    name = "BatchPacket";

    unsafeWrite(bind: BufferIndex, value: Packet[]) {
        for (const packet of value) {
            bind.push(packet.packetId);
            packet.write(bind);
        }
        bind.push(0xff);
    };

    read(bind: BufferIndex) {
        const data = [];
        let packetId: number;

        while ((packetId = bind.incGet()) !== 0xff) {
            const clazz = Packets[packetId];
            if (!clazz) throw new PacketError("Invalid packet", bind);
            data.push(clazz.read(bind));
        }

        return data;
    };

    unsafeSize(value: Packet[]) {
        return value.reduce((acc, p) => acc + p.getSize() + 1, 0) + 1;
    };

    findProblem(value: any) {
        if (!Array.isArray(value)) return "Expected an array of packets";
        for (const p of value) {
            if (!(p instanceof Packet)) return "Expected an array of packets";
        }
    };

    get sample() {
        return <Packet[]>[];
    };
};

export type PkStr<T extends keyof typeof PacketIds> = typeof PacketStructs[typeof PacketIds[T]];
export type PacketByName<T extends keyof typeof PacketIds> = Packet<PkStr<T>>;

export type PacketNameToPacket<N extends keyof typeof PacketIds> = {
    new(data: PkStr<N>["__TYPE__"]): Packet<PkStr<N>>;
    read(bind: BufferIndex): Packet<PkStr<N>>;
    __STRUCT__: PkStr<N>; // for typings
};

export const Packets: { [Name in keyof typeof PacketIds]: PacketNameToPacket<Name> } = <any>{};

export type AnyPacketConstructor = typeof Packets[keyof typeof Packets];

export const PacketStructs = {
    [PacketIds.Batch]: BatchStruct,
    [PacketIds.Ping]: X.date,
    [PacketIds.SendMessage]: X.string16,

    [PacketIds.SHandshake]: X.object.struct({
        entityId: X.u32,
        x: X.f32, y: X.f32
    }),
    [PacketIds.SChunk]: X.object.struct({
        x: X.i32,
        data: ChunkBlocksBin,
        entities: X.array.typed(EntityUpdateStruct),
        resetEntities: X.bool
    }),
    [PacketIds.SEntityUpdate]: EntityUpdateStruct,
    [PacketIds.SEntityRemove]: X.u32,
    [PacketIds.SBlockUpdate]: X.object.struct({
        x: X.i32,
        y: X.u32,
        fullId: X.u16
    }),
    [PacketIds.SBlockBreakingUpdate]: X.object.struct({
        entityId: X.u32,
        time: X.f32,
        x: X.i32,
        y: X.u32
    }),
    [PacketIds.SBlockBreakingStop]: X.object.struct({
        entityId: X.u32
    }),
    [PacketIds.SDisconnect]: X.string16,

    [PacketIds.SPlaySound]: X.object.struct({
        x: X.f32,
        y: X.f32,
        path: X.string16
    }),

    [PacketIds.CAuth]: X.object.struct({
        name: X.string8,
        skin: X.string16,
        protocol: X.u16
    }),
    [PacketIds.CQuit]: X.null,
    [PacketIds.CMovement]: X.object.struct({
        x: X.f32,
        y: X.f32,
        rotation: X.f32
    }),
    [PacketIds.CStartBreaking]: X.object.struct({
        x: X.i32,
        y: X.u32
    }),
    [PacketIds.CStopBreaking]: X.null,
    [PacketIds.CCloseContainer]: X.null
} as const;

export function readPacket(buffer: Buffer) {
    buffer = getServer().config.packetCompression ? zstdOptionalDecode(buffer) : buffer;
    const clazz = Packets[buffer[0]];
    if (!clazz) throw new PacketError("Invalid packet", buffer);
    return <Packet>clazz.read(new BufferIndex(buffer, 1));
}