import {initItems} from "../meta/Items";
import {Packets} from "../network/Packets";
import {PacketIds} from "../meta/PacketIds";
import {Packet} from "../network/Packet";
import {ZstdInit} from "@oneidentity/zstd-js";

export function initPackets() {
    for (const id in PacketIds) {
        const name = PacketIds[id];
        const pId = parseInt(id);
        if (isNaN(pId)) continue;
        // @ts-ignore
        Packets[id] = Packets[name] = class extends Packet {
            constructor(data: any) {
                super(pId, data);
            };
        };
    }
}

export async function initCommon() {
    initItems();
    initPackets();
    await ZstdInit();
}