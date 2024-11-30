import {Bin, BufferIndex} from "stramp";
import {getServer, zstdOptionalEncode} from "$/utils/Utils";
import {PacketStructs} from "$/network/Packets";

export const CompressPackets = true;

export default class Packet<T extends Bin = Bin> {
    constructor(public packetId: number, public data: T["__TYPE__"]) {
    };

    get struct(): T {
        return PacketStructs[this.packetId];
    };

    static read(bind: BufferIndex) {
        // @ts-ignore
        const pk = <this>new this(0, null);
        pk.data = pk.struct.read(bind);
        return pk;
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
        if (!this.struct) return;
        this.struct.assert(this.data);
    };

    serialize() {
        this.assert();
        const bind = BufferIndex.allocUnsafe(this.getSize() + 1);
        bind.push(this.packetId);
        this.write(bind);
        return getServer().config.packetCompression ? zstdOptionalEncode(bind.buffer) : bind.buffer;
    };

    send(ws: any) {
        if ("sendImmediate" in ws) return ws.sendImmediate(this);
        const buf = this.serialize();
        if ("send" in ws) ws.send(buf);
        else ws.postMessage(buf);
    };
}