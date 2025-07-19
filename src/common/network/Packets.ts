import PacketError from "@/network/PacketError";
import Packet from "@/network/Packet";
import {getServer, zstdOptionalDecode} from "@/utils/Utils";
import {PacketIds} from "@/meta/PacketIds";
import X, {Bin, BufferIndex} from "stramp";
import ChunkBlocksBin from "@/structs/world/ChunkBlocksBin";
import {GameModeStruct} from "@/command/arguments/GameModeArgument";
import {InventoryNameBin} from "@/structs/item/InventoryNameBin";
import ItemStruct, {InventoryContentStruct} from "@/structs/item/ItemStruct";
import {ContainerIDBin} from "@/meta/Inventories";
import EntityAnimationStruct from "@/structs/entity/EntityAnimationStruct";

export const EntityUpdateStruct = X.object.struct({
    typeId: X.u8,
    entityId: X.u32,
    props: X.object
});

const BatchStruct = new class BatchStruct extends Bin<Packet[]> {
    isOptional = false as const;
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

    findProblem(value: unknown) {
        if (!Array.isArray(value)) return this.makeProblem("Expected an array of packets");
        for (const p of value) {
            if (!(p instanceof Packet)) return this.makeProblem("Expected an array of packets");
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

export const Packets = <{ [Name in keyof typeof PacketIds]: PacketNameToPacket<Name> }>{};

export type AnyPacketConstructor = typeof Packets[keyof typeof Packets];

export const PacketStructs = {
    [PacketIds.Batch]: BatchStruct,
    [PacketIds.Ping]: X.date,
    [PacketIds.SendMessage]: X.string16,

    [PacketIds.SPreLoginInformation]: X.object.struct({
        auth: X.any.of(X.string16, X.null)
    }),
    [PacketIds.SHandshake]: X.object.struct({
        entityId: X.u32,
        x: X.f32, y: X.f32,
        handIndex: X.u8
    }),
    [PacketIds.SChunk]: X.object.struct({
        x: X.i32,
        biome: X.u8,
        data: ChunkBlocksBin
    }),
    [PacketIds.SSetChunkEntities]: X.object.struct({
        x: X.i32,
        entities: X.array.typed(EntityUpdateStruct)
    }),
    [PacketIds.SEntityUpdate]: EntityUpdateStruct,
    [PacketIds.SEntityAnimation]: X.object.struct({
        entityId: X.u32,
        animation: EntityAnimationStruct
    }),
    [PacketIds.SEntityRemove]: X.u32,
    [PacketIds.SBlockUpdate]: X.object.struct({
        x: X.i32,
        y: X.u32,
        fullId: X.u16
    }),
    [PacketIds.SBreakBlock]: X.object.struct({
        x: X.i32,
        y: X.u32,
        fullId: X.u16
    }),
    [PacketIds.SPlaceBlock]: X.object.struct({
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
        volume: X.f32,
        path: X.string16
    }),
    [PacketIds.SSetAttributes]: X.object.struct({
        walkSpeed: X.f32,
        flySpeed: X.f32,
        jumpVelocity: X.f32,
        health: X.f32,
        maxHealth: X.f32,
        canPhase: X.bool,
        // immobile: X.bool, // buggy
        // invincible: X.bool, // no need
        invisible: X.bool,
        // resistanceLevel: X.u8, // no need
        // fireImmunity: X.bool, // no need

        xp: X.u32,
        xpLevels: X.u32,
        gamemode: GameModeStruct,
        canBreak: X.bool,
        canPlace: X.bool,
        canAttack: X.bool,
        blockReach: X.f32,
        attackReach: X.f32,
        isFlying: X.bool,
        canToggleFly: X.bool,
        food: X.f32,
        maxFood: X.f32,
        placeCooldown: X.f32,
        instantBreak: X.bool,
        infiniteResource: X.bool,
        seeShadows: X.bool
    }),
    [PacketIds.SSetInventory]: X.object.struct({
        name: InventoryNameBin,
        items: X.array.typed(InventoryContentStruct)
    }),
    [PacketIds.SUpdateInventory]: X.object.struct({
        name: InventoryNameBin,
        indices: X.array.typed(X.object.struct({
            index: X.u8,
            item: InventoryContentStruct
        }))
    }),
    [PacketIds.SSetContainer]: X.object.struct({
        container: ContainerIDBin,
        x: X.i32,
        y: X.u32
    }),
    [PacketIds.SSetHandIndex]: X.u8,
    [PacketIds.SResetPlaceCooldown]: X.null,

    [PacketIds.CAuth]: X.object.struct({
        name: X.string8,
        skin: X.string16,
        version: X.u16,
        secret: X.any.of(X.buffer.sized(128), X.null)
    }),
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
    [PacketIds.COpenInventory]: X.null,
    [PacketIds.CCloseInventory]: X.null,
    [PacketIds.CPlaceBlock]: X.object.struct({
        x: X.i32,
        y: X.u32,
        rotation: X.u8
    }),
    [PacketIds.CInteractBlock]: X.object.struct({
        x: X.i32,
        y: X.u32
    }),
    [PacketIds.CToggleFlight]: X.null,
    [PacketIds.CSetHandIndex]: X.u8,
    [PacketIds.CItemTransfer]: X.object.struct({
        fromInventory: InventoryNameBin,
        fromIndex: X.u8,
        to: X.array.typed(X.object.struct({
            inventory: InventoryNameBin,
            index: X.u8,
            count: X.u8
        }))
    }),
    [PacketIds.CItemDrop]: X.object.struct({
        inventory: InventoryNameBin,
        index: X.u8,
        count: X.u8
    }),
    [PacketIds.CItemSwap]: X.object.struct({
        fromInventory: InventoryNameBin,
        fromIndex: X.u8,
        toInventory: InventoryNameBin,
        toIndex: X.u8
    }),
    [PacketIds.CSetItem]: X.object.struct({ // only when infiniteResource is on (for now it's just for creative gamemode)
        inventory: InventoryNameBin,
        index: X.u8,
        item: ItemStruct
    }),
    [PacketIds.CRespawn]: X.null
} as const;

export function readPacket(buffer: Buffer) {
    buffer = getServer().config.packetCompression ? zstdOptionalDecode(buffer) : buffer;
    const clazz = Packets[buffer[0]];
    if (!clazz) throw new PacketError("Invalid packet", buffer);
    return <Packet>clazz.read(new BufferIndex(buffer, 1));
}