import {PacketIds} from "./PacketIds";
import {Bin} from "stramp";

export abstract class Packet<T, V = T["struct"]["__TYPE__"]> {
    abstract static packetId: PacketIds;
    abstract static struct: Bin;
    clazz: any;

    constructor(public data: V) {
        this.clazz = this.constructor;
    };

    getSize(): number {
        if (!this.clazz.struct) return 0;
        return this.clazz.struct.getSize(this.data);
    };

    write(buffer: Buffer, index: [number]) {
        if (!this.clazz.struct) return;
        this.clazz.struct.write(buffer, index, this.data);
    };

    assert() {
        if (!this.clazz.struct) return;
        this.clazz.struct.assert(this.data);
    };

    serialize() {
        this.assert();
        const buffer = Buffer.allocUnsafe(this.getSize() + 1);
        buffer[0] = this.clazz.packetId;
        this.write(buffer, [1]);
        return buffer;
    };

    static read<T, V>(buffer: Buffer, index: [number]): Packet<T, V> {
        if (!this.struct) return new (<any>this)();
        const data = this.struct.read(buffer, index);
        return new (<any>this)(data);
    };

    send(ws) {
        if ("send" in ws) ws.send(this.serialize());
        else ws.postMessage(this.serialize());
    };
}