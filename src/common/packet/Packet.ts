import {PacketIds} from "../meta/PacketIds.js";
import {Bin} from "stramp";
import {zstdOptionalEncode} from "../utils/Utils.js";

export type PacketType<Class extends { T: any }> = Packet<Class["T"]>;

export abstract class Packet<T extends Bin = Bin> {
    abstract static packetId: PacketIds;
    abstract struct: T;
    abstract static struct: Bin;

    constructor(public data: T["__TYPE__"]) {
    };

    static read(buffer: Buffer, index: [number]) {
        const pk = <this>new (<any>this)();
        if (!pk.struct) return pk;
        pk.data = pk.struct.read(buffer, index);
        return pk;
    };

    write(buffer: Buffer, index: [number]) {
        if (!this.struct) return;
        this.struct.write(buffer, index, this.data);
    };

    getSize(): number {
        if (!this.struct) return 0;
        return this.struct.getSize(this.data);
    };

    assert() {
        if (!this.struct) return;
        this.struct.assert(this.data);
    };

    serialize() {
        this.assert();
        const buffer = Buffer.allocUnsafe(this.getSize() + 1);
        buffer[0] = (<any>this.constructor).packetId;
        this.write(buffer, [1]);
        return zstdOptionalEncode(buffer);
    };

    send(ws) {
        if ("send" in ws) ws.send(this.serialize());
        else ws.postMessage(this.serialize());
    };
}

export function makePacketClass<T extends PacketIds, K extends Bin>(id: T, struct: K): {
    new(data: K["__TYPE__"]): Packet<K>,
    T: Packet<K>
} {
    return <any>class extends Packet<K> {
        static packetId = id;
        static struct = struct;
        struct = struct;
    };
}