import {Bin} from "stramp";
import {getServer, zstdOptionalEncode} from "../utils/Utils";
import {PacketStructs} from "./Packets";

export const CompressPackets = true;

export class Packet<T extends Bin = Bin> {
    constructor(public packetId: number, public data: T["__TYPE__"]) {
    };

    get struct(): T {
        return PacketStructs[this.packetId];
    };

    static read(buffer: Buffer, index: [number]) {
        // @ts-ignore
        const pk = <this>new this(0, null);
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
        buffer[0] = this.packetId;
        this.write(buffer, [1]);
        return getServer().config.packetCompression ? zstdOptionalEncode(buffer) : buffer;
    };

    send(ws: any) {
        const buf = this.serialize();
        if ("send" in ws) ws.send(buf);
        else ws.postMessage(buf);
    };
}