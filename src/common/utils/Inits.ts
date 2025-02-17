import {initItems} from "@/meta/Items";
import {Packets} from "@/network/Packets";
import {PacketIds} from "@/meta/PacketIds";
import Packet from "@/network/Packet";
import {ZstdInit} from "@oneidentity/zstd-js";
import {EntityClasses, EntityIds, EntityNameMap} from "@/meta/Entities";
import Player from "@/entity/defaults/Player";
import {Effects} from "@/meta/Effects";
import Effect from "@/effect/Effect";
import SpeedEffect from "@/effect/defaults/SpeedEffect";
import SlownessEffect from "@/effect/defaults/SlownessEffect";
import {Bin} from "stramp";
import ItemEntity from "@/entity/defaults/ItemEntity";
import XPOrbEntity from "@/entity/defaults/XPOrbEntity";
import {TileClasses, TileIds, TileNameMap} from "@/meta/Tiles";
import ChestTile from "@/tile/defaults/ChestTile";
import FurnaceTile from "@/tile/defaults/FurnaceTile";

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
    initBaseEntities();
    initBaseTiles();
    await ZstdInit();
}

export function initBaseEntities() {
    EntityClasses[EntityIds.PLAYER] = Player;
    EntityClasses[EntityIds.ITEM] = ItemEntity;
    EntityClasses[EntityIds.XP_ORB] = XPOrbEntity;
    EntityNameMap.player = EntityIds.PLAYER;
    EntityNameMap.item = EntityIds.ITEM;
    EntityNameMap.xp_orb = EntityIds.XP_ORB;
}

export function initBaseTiles() {
    TileClasses[TileIds.CHEST] = ChestTile;
    TileClasses[TileIds.FURNACE] = FurnaceTile;
    TileNameMap.chest = TileIds.CHEST;
    TileNameMap.furnace = TileIds.FURNACE;
}