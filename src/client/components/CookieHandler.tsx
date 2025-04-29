import {useEffect, useState} from "react";

export function cookieExists(name: string) {
    return !!getCookie(name);
}

export function getCookie(name: string) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
}

export function setCookie(name: string, value: string | null, days = 30) {
    if (value === null) return deleteCookie(name);

    if (value === getCookie(name)) return;

    let expires = "";

    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }

    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/`

    subscribers.forEach(callback => callback());
}

export function deleteCookie(name: string) {
    if (!cookieExists(name)) return;

    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;

    subscribers.forEach(callback => callback());
}

const subscribers = new Set<() => void>();

if (typeof window !== "undefined") {
    setInterval(() => {
        subscribers.forEach(callback => callback());
    }, 250);
}

export function useCookie(name: string) {
    const [value, setValue] = useState(getCookie(name));

    useEffect(() => {
        const update = () => {
            const newValue = getCookie(name);
            setValue(newValue);
        };

        subscribers.add(update);

        return () => {
            subscribers.delete(update);
        };
    }, [name]);

    return value;
}