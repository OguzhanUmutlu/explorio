import {Effect} from "@explorio/effect/Effect";

export enum EffectIds {
    Speed,
    Slowness,

    Haste,
    MiningFatigue,

    Strength,
    Weakness,

    FireResistance,

    Blindness,
    NightVision,

    Poison,
    Regeneration,

    Wither,

    Hunger,
    Saturation,

    Invisibility,

    __MAX__
}

export const Effects = <Record<EffectIds, Effect>>{};