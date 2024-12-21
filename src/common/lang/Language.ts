import {getServer} from "@/utils/Utils";
import en from "@/lang/defaults/en";
import tr from "@/lang/defaults/tr";

export function defineLanguage(l: Record<keyof typeof en, string>) {
    return l;
}

export const Languages = {
    en, tr
} as const;
export type LanguageName = keyof typeof Languages;

export function getLanguage() {
    return getServer().config.language;
}

export function translate(key: keyof typeof en, lang = getLanguage()) {
    return Languages[lang][key] ?? Languages.en[key] ?? "???";
}