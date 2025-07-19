import {Packets} from "@/network/Packets";
import {PacketIds} from "@/meta/PacketIds";
import Packet from "@/network/Packet";
import {ZstdInit} from "@oneidentity/zstd-js";
import {Bin} from "stramp";

export function initPackets() {
    for (const id in PacketIds) {
        const name = PacketIds[id];
        const pId = parseInt(id);
        if (isNaN(pId)) continue;
        // @ts-expect-error It is readonly so it throws an error.
        Packets[id] = Packets[name] = class<T extends Bin> extends Packet<T> {
            constructor(data: T["__TYPE__"]) {
                super(pId, data);
            };
        };
    }
}

export async function initCommon() {
    initPackets();
    await ZstdInit();
}