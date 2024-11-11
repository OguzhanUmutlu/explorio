import {initItems} from "../meta/Items";
import {Packets, PacketStructs} from "../network/Packets";
import {PacketIds} from "../meta/PacketIds";
import {Packet} from "../network/Packet";
import {ZstdInit} from "@oneidentity/zstd-js";

export function initPackets() {
    for (const id in PacketIds) {
        const name = PacketIds[id];
        const pId = parseInt(id);
        const struct = PacketStructs[name];
        if (isNaN(pId)) continue;
        const pk = Packets[id] = Packets[name] = class extends Packet {
            constructor(data) {
                super(pId, data, struct);
            };
        };
        pk.send = (ws, data) => new pk(data).send(ws);
    }
}

export async function initCommon() {
    initItems();
    initPackets();
    await ZstdInit();
}