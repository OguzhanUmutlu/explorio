import {initItems} from "../meta/Items";
import {Packets} from "../network/Packets";
import {PacketIds} from "../meta/PacketIds";
import {Packet} from "../network/Packet";
import {ZstdInit} from "@oneidentity/zstd-js";
import {Entities, EntityClasses} from "../meta/Entities";
import {Player} from "../entity/types/Player";
import {Effects} from "@explorio/utils/Effects";
import {Effect} from "@explorio/effect/Effect";
import {SpeedEffect} from "@explorio/effect/types/SpeedEffect";
import {SlownessEffect} from "@explorio/effect/types/SlownessEffect";

export function initEffects() {
    for (const clazz of [
        SpeedEffect,
        SlownessEffect
    ]) {
        const effect = <Effect>new clazz;
        Effects[effect.id] = effect;
    }
}

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
    initBaseEntities();
    await ZstdInit();
}

export function initBaseEntities() {
    EntityClasses[Entities.PLAYER] = Player;
}