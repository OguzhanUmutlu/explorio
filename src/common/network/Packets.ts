import {PacketError} from "./PacketError";
import {Packet} from "./Packet";
import {getServer, zstdOptionalDecode} from "../utils/Utils";
import {PacketIds, PacketNames} from "../meta/PacketIds";
import X from "stramp";
import {ChunkBlocksBin} from "../utils/Bins";

export const CurrentGameProtocol = 2;

const EntityUpdateStruct = X.object.struct({
    typeId: X.u8,
    entityId: X.u32,
    props: X.object
}) as const;

const BatchStruct = X.makeBin({
    name: "BatchPacket",
    write(buffer, index, value: Packet[]) {
        for (const packet of value) {
            buffer[index[0]++] = packet.packetId;
            packet.write(buffer, index);
        }
        buffer[index[0]++] = 0xff;
    },
    read(buffer, index) {
        const data = [];
        while (buffer[index[0]] !== 0xff) {
            const packetId = buffer[index[0]++];
            const clazz = Packets[packetId];
            if (!clazz) throw new PacketError("Invalid packet", buffer);
            data.push(clazz.read(buffer, index));
        }
        index[0]++;
        return data;
    },
    size(value) {
        return value.reduce((acc, p) => acc + p.getSize() + 1, 0) + 1;
    },
    validate(value) {
        if (!Array.isArray(value)) return "Expected an array of packets";
        for (const p of value) {
            if (!(p instanceof Packet)) return "Expected an array of packets";
        }
    },
    sample() {
        return <Packet[]>[];
    }
});

export type PacketId = PacketIds[keyof typeof PacketIds];

export type PacketIdToName<T extends PacketIds> = keyof typeof PacketIds;
export type PacketNameToId<T extends keyof typeof PacketIds> = PacketIds[T];
export type PacketIdToStruct<T extends PacketIds> = PacketNameToStruct<PacketIdToName<T>>;
export type PacketNameToStruct<T extends keyof typeof PacketIds> = typeof PacketStructs[T];
export type PacketByName = {
    [T in keyof typeof PacketIds]: Packet<PacketNameToStruct<T>>
};

export type PacketIdToPacket<Id extends PacketIds> = {
    new(data: PacketIdToStruct<Id>["__TYPE__"]): Packet<PacketIdToStruct<Id>> & {
        send(ws, data: PacketIdToStruct<Id>["__TYPE__"]): Promise<void>;
    };
    __T__: Packet<PacketIdToStruct<Id>>

};

export const Packets: { [Name in keyof typeof PacketIds]: PacketIdToPacket<PacketNameToId<Name>> }
    & { [Id in PacketIds]: PacketIdToPacket<Id> } = <any>{};

export type AnyPacketConstructor = typeof Packets[keyof typeof Packets];

export const PacketStructs = {
    [PacketNames.Batch]: BatchStruct,
    [PacketNames.Ping]: X.date,
    [PacketNames.SendMessage]: X.string16,

    [PacketNames.CAuth]: X.object.struct({
        name: X.string8,
        skin: X.string16,
        protocol: X.u16
    }),
    [PacketNames.CQuit]: X.null,
    [PacketNames.CMovement]: X.object.struct({
        x: X.f32,
        y: X.f32,
        rotation: X.f32
    }),
    [PacketNames.CStartBreaking]: X.object.struct({
        x: X.i32,
        y: X.u32
    }),
    [PacketNames.CStopBreaking]: X.null,

    [PacketNames.SBlockBreakingStop]: X.object.struct({
        entityId: X.u32
    }),
    [PacketNames.SBlockBreakingUpdate]: X.object.struct({
        entityId: X.u32,
        time: X.f32,
        x: X.i32,
        y: X.u32
    }),
    [PacketNames.SBlockUpdate]: X.object.struct({
        x: X.i32,
        y: X.u32,
        fullId: X.u16
    }),
    [PacketNames.SChunk]: X.object.struct({
        x: X.i32,
        data: ChunkBlocksBin,
        entities: X.array.typed(EntityUpdateStruct),
        resetEntities: X.bool
    }),
    [PacketNames.SDisconnect]: X.string16,
    [PacketNames.SEntityRemove]: X.u32,
    [PacketNames.SEntityUpdate]: EntityUpdateStruct,
    [PacketNames.SHandshake]: X.object.struct({
        entityId: X.u32,
        x: X.f32, y: X.f32
    }),
    [PacketNames.SPlaySound]: X.object.struct({
        x: X.f32,
        y: X.f32,
        path: X.string16
    })
} as const;

export function readPacket(buffer: Buffer): Packet {
    buffer = getServer().config.packetCompression ? zstdOptionalDecode(buffer) : buffer;
    const clas = Packets[buffer[0]];
    if (!clas) throw new PacketError("Invalid packet", buffer);
    return clas.read(buffer, [1]);
}