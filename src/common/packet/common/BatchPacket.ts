import {Packet} from "../Packet";
import {PacketIds} from "../PacketIds";
import {PacketClasses} from "../Packets";
import {PacketError} from "../PacketError";

export class BatchPacket extends Packet<null, Packet<any>[]> {
    packetId = PacketIds.BATCH;
    static struct = null;
    struct = null;

    static read(buffer: Buffer, index: [number]) {
        const data = [];
        while (buffer[index[0]] !== 0xff) {
            const packetId = buffer[index[0]++];
            const clazz = PacketClasses[packetId];
            if (!clazz) throw new PacketError("Invalid packet", buffer);
            data.push(clazz.read(buffer, index));
        }
        index[0]++;
        return new BatchPacket(data);
    };

    getSize() {
        return this.data.reduce((acc, p) => acc + p.getSize() + 1, 0) + 1;
    };

    assert() {
        for (const packet of this.data) {
            packet.assert();
        }
    };

    write(buffer: Buffer, index: [number]) {
        for (const packet of this.data) {
            buffer[index[0]++] = (<any>packet.constructor).packetId;
            packet.write(buffer, index);
        }
        buffer[index[0]++] = 0xff;
    };
}