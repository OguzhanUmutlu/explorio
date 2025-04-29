// @a - all players in all worlds
// @p - closest player to the sender's position
// @s - sender
// @e - every entity in all worlds
// @c - every entity in the current chunk

import CommandError from "@/command/CommandError";
import Token from "@/command/token/Token";
import SelectorToken from "@/command/token/SelectorToken";

export const SelectorTags = ["a", "p", "s", "e", "c"] as const;
export type SelectorTagName = typeof SelectorTags[number];
type TokenTypeMap = {
    text: string;
    number: number;
    bool: boolean;
    selector: SelectorTagName;
    range: [number, number];
    object: { [k: string]: TokenValue };
    array: TokenValueArray;
    rawObject: Record<string, AnyToken>;
    rawArray: AnyToken[];
};
export type TokenType = keyof TokenTypeMap;

type TokenValueArray = TokenValue[];

export type TokenValue<T extends keyof TokenTypeMap = keyof TokenTypeMap> = T extends "array"
    ? TokenValueArray
    : TokenTypeMap[T];

export const WordRegex = /^[a-zA-Z~_^!.][a-zA-Z~_^!\d.]*/;

export type AnyToken = Token | SelectorToken;

export function readBool(text: string, index: number): Token<"bool"> | null {
    if (text.substring(index, index + 4) === "true") return Token.bool(text, index, index + 4, true);
    if (text.substring(index, index + 5) === "false") return Token.bool(text, index, index + 5, false);

    return null;
}

export function readSelector(text: string, index: number): SelectorToken {
    const selName = <SelectorTagName>text[index + 1];
    if (text[index] !== "@" || !SelectorTags.includes(selName)) {
        /*const word = readWord(text, index, /^[a-zA-Z_]+/);
        if (word.value.length > 1) {
            return new SelectorToken(text, word.start, word.end, "a", {
                __name__only__: word // this basically directly gets the player from the players object, a hacky solution
            });
        }*/
        return null;
    }

    if (text[index + 2] === "{") {
        const args = readObject(text, index + 2, false, true);
        return new SelectorToken(text, index, args.end, selName, args.value);
    } else if (text[index + 2] && text[index + 2] !== " ") return null;
    return new SelectorToken(text, index, index + 1, selName, {});
}

export function readString(text: string, index: number): Token<"text"> | null {
    const startIndex = index;
    const start = text[index];

    if (start !== '"' && start !== "'") return null;

    index++;

    let value = "";
    let escape = false;

    for (let i = index; i < text.length; i++) {
        if (escape) {
            escape = false;
            value += text[i];
            continue;
        }

        if (text[i] === "\\") {
            escape = !escape;
            continue;
        }

        if (text[i] === start) {
            return Token.text(text, startIndex, i + 1, value);
        }

        value += text[i];
    }

    throw new CommandError(`Unclosed string at ${startIndex + 1}th character`);
}

export function readWord(text: string, index: number, regex: RegExp = WordRegex): Token<"text"> {
    const match = text.substring(index).match(regex);
    if (!match) return Token.text(text, index, index, "");
    const word = match[0];
    return Token.text(text, index, index + word.length, word);
}

export function readWordOrString(text: string, index: number, regex: RegExp = WordRegex) {
    if (text[index] !== "\"" && text[index] !== "'") return readWord(text, index, regex);

    return readString(text, index);
}

export function readNumber(text: string, index: number) {
    if (isNaN(+text[index])) return null; // Only allowing X and X.X syntax for numbers.
    const tok = readWord(text, index, /^-?\d+(\.\d+)?(?=[^a-zA-Z]|$)/);
    const num = parseFloat(tok.value);
    if (isNaN(num)) return null;
    return Token.number(text, tok.start, tok.end, num);
}

export function readRange(text: string, index: number) {
    if (text[index] === "." && text[index + 1] === ".") {
        // example: ..25
        const num = readNumber(text, index + 2);
        if (num === null) {
            // example: ..
            return Token.range(text, index, index + 2, [-Infinity, Infinity]);
        }

        return Token.range(text, index, num.end, [-Infinity, num.value]);
    }

    const num1 = readNumber(text, index);
    if (num1 === null) return null;
    index = num1.end;
    if (text[index] !== "." || text[++index] !== ".") return null;
    index++;

    const num2 = readNumber(text, index);
    if (num2 === null) {
        // example: 25..
        return Token.range(text, num1.start, index, [num1.value, Infinity]);
    }

    // example: 25..25
    return Token.range(text, num1.start, num2.end, [num1.value, num2.value]);
}

export function readObject<isRaw extends boolean>(
    text: string, index: number, allowSelector = false,
    raw: isRaw) {
    const char = text[index];
    if (char !== "{") return null;

    const object = {};
    const startIndex = index;
    index++;
    index = skipWhitespace(text, index);
    for (let i = index; i < text.length;) {
        const char = text[i];
        if (char === "}") {
            return <isRaw extends true ? Token<"rawObject"> : Token<"object">>new Token(
                text, startIndex, i + 1, raw ? "rawObject" : "object", object);
        }

        if (char === ",") {
            i++;
            continue;
        }
        i = skipWhitespace(text, i);

        const key = readWordOrString(text, i);
        if (!key || (key.type === "text" && !key.value)) {
            throw new CommandError(`Unexpected character '${text[i]}' at ${i + 1}th character`);
        }
        if (!key.value) {
            throw new CommandError(`Empty key at ${i + 1}th character`);
        }

        i = skipWhitespace(text, key.end);

        if (
            text[i] !== ":" // x : y
            && text[i] !== "=" // x = y
            && !(raw && text[i] === "!" && text[i + 1] === "=") // x != y (only works if raw=true)
        ) throw new CommandError(`Missing ':' or '=' or '!=' at ${i + 1}th character`);
        const not = text[i] === "!";
        if (not) i++;
        i++;
        i = skipWhitespace(text, i);

        const value = (allowSelector ? readSelector(text, i) : null) || readAny(text, i, allowSelector, raw);

        if (!value || (value.type === "text" && !value.value)) {
            throw new CommandError(`Unexpected character '${text[i]}' at ${i + 1}th character`);
        }

        i = skipWhitespace(text, value.end);
        if (not) value.yes = 0;
        object[key.value] = raw ? value : value.value;
    }

    throw new CommandError(`Unclosed object at ${startIndex + 1}th character`);
}

export function readArray<isRaw extends boolean>(
    text: string, index: number, allowSelector = false,
    raw: isRaw) {
    const char = text[index];
    if (char !== "[") return null;

    const array = [];
    const startIndex = index;
    index++;

    for (let i = index; i < text.length; i++) {
        const char = text[i];
        if (char === "]") {
            return <isRaw extends true ? Token<"rawArray"> : Token<"array">>new Token(text, startIndex, i + 1, raw ? "rawArray" : "array", array);
        }

        const value = (allowSelector ? readSelector(text, i) : null) || readAny(text, i, allowSelector, raw);
        if (!value) throw new CommandError(`Invalid value at ${i + 1}th character`);
        i = skipWhitespace(text, value.end);
        array.push(raw ? value : value.value);
    }

    throw new CommandError(`Unclosed array at ${startIndex + 1}th character`)
}

export function skipWhitespace(text: string, index: number) {
    return readWord(text, index, /^\s+/).end;
}

// List of possible results:
// "Hello, world!" {type: "text", value: "Hello, world!", index: 10}
// true {type: "bool", value: true, index: 10}
// 25 {type: "number", value: 25, index: 10}
// 10..25 {type: "range", value: [10, 25], index: 10}
// ..25 {type: "range", value: [-Infinity, 25], index: 10}
// 10.. {type: "range", value: [10, Infinity], index: 10}
// .. {type: "range", value: [-Infinity, Infinity], index: 10}
// {x=10 y=20} {type: "object", value: {x: 10, y: 20}, index: 10}
// [10 20] {type: "array", value: [10, 20], index: 10}
// @a{x=20} {type: "selector", value: "a", arguments: {x: {type:"number",value:20}}, index: 10}
// Hello {type: "text", value: "Hello", index: 10}
export function readAny(text: string, index: number, allowSelector = false, raw = false) {
    return readString(text, index)
        || readBool(text, index)
        || readRange(text, index)
        || readNumber(text, index)
        || readObject(text, index, allowSelector, raw)
        || readArray(text, index, allowSelector, raw)
        || readWord(text, index);
}

// Splits the given command parameters
// Input: @a{x=10, y=10} "hello, world!" hello, world!
// Output: [{selector: "a", arguments: {x: 10, y: 20}}, "hello, world!", "hello,", "world!"]
export function splitParameters(params: string) {
    const args: AnyToken[] = [];

    for (let i = 0; i < params.length; i++) {
        i = skipWhitespace(params, i);
        const token = readSelector(params, i) || readAny(params, i, false, true);
        if (!token) break;
        args.push(token);
        i = token.end;
    }

    return args;
}

export function cleanText(text: string) {
    return text.replaceAll(/\p{C}/gu, "").trim();
}