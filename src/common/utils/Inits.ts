import {initItems} from "@/meta/Items";
import {Packets} from "@/network/Packets";
import {PacketIds} from "@/meta/PacketIds";
import Packet from "@/network/Packet";
import {ZstdInit} from "@oneidentity/zstd-js";
import {EntityClasses, EntityNameMap} from "@/meta/Entities";
import {Effects} from "@/meta/Effects";
import Effect from "@/effect/Effect";
import {Bin} from "stramp";
import {TileClasses, TileNameMap} from "@/meta/Tiles";
import {ClassOf} from "@/utils/Utils";

import Tile from "@/tile/Tile";
import Entity from "@/entity/Entity";
import Command from "@/command/Command";

export function registerAny(clazz: ClassOf<Entity | Tile | Effect | Command>) {
    const sample = new clazz();

    if (sample instanceof Entity) {
        EntityClasses[sample.typeId] = clazz;
        EntityNameMap[sample.typeName] = sample.typeId;
    } else if (sample instanceof Tile) {
        TileClasses[sample.typeId] = clazz;
        TileNameMap[sample.typeName] = sample.typeId;
    } else if (sample instanceof Effect) Effects[sample.typeId] = sample;
    else return false;

    return true;
}

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
    initItems();
    initPackets();
    await ZstdInit();
}