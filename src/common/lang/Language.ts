export function defineLanguage(l: Record<keyof typeof en, string>) {
    return l;
}

import en from "@/lang/defaults/en";
import tr from "@/lang/defaults/tr";

export const Languages = {
    en, tr
} as const;
export type LanguageName = keyof typeof Languages;
export type LanguageKey = keyof typeof en;

export type Translatable =
    { key: LanguageKey, args?: Record<string, string | number> }
    & ((args: Record<string, string | number>) => Translatable);

export const T: { [k in LanguageKey]: Translatable } = {};

for (const key in en) {
    T[key] = function (args: Record<string, string | number>) {
        T[key].args = args;
        return T[key];
    }
    T[key].key = key;
}