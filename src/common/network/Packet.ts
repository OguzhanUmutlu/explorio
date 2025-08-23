import {Bin, BufferIndex} from "stramp";
import {PacketStructs} from "@/network/Packets";

export class Packet<T extends Bin = Bin> {
    __TYPE__: T["__TYPE__"];

    constructor(public packetId: number, public data: typeof this["__TYPE__"]) {
    };

    get struct(): T {
        return PacketStructs[this.packetId];
    };

    static read(bind: BufferIndex) {
        const pk = new this(0, null);
        pk.data = pk.struct.read(bind);
        // @ts-expect-error It gives a TS error, I say no.
        return <this>pk;
    };

    write(bind: BufferIndex) {
        if (!this.struct) return;
        this.struct.write(bind, this.data);
    };

    getSize(): number {
        if (!this.struct) return 0;
        return this.struct.getSize(this.data);
    };

    assert() {
        (<(_: unknown) => void>this.struct?.assert)(this.data);
    };

    serialize() {
        this.assert();
        const bind = BufferIndex.allocUnsafe(this.getSize() + 1);
        bind.push(this.packetId);
        this.write(bind);
        return bind.buffer;
    };
}