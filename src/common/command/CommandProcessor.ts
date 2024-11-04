// @a - all players in all worlds
// @p - closest player to the sender's position
// @s - sender
// @e - every entity in all worlds
// @c - every entity in the current chunk

import {CommandError} from "./Command";
import {checkArray, checkObject} from "../utils/Utils";

export const SelectorTags = ["a", "p", "s", "e", "c"] as const;
export type SelectorTagName = typeof SelectorTags[number];
export type TokenType =
    "text"
    | "number"
    | "range"
    | "bool"
    | "selector"
    | "object"
    | "array"
    | "rawObject"
    | "rawArray";
type TokenTypeMap = {
    text: string;
    number: number;
    bool: boolean;
    selector: SelectorTagName;
    object: Record<string, TokenValue>;
    array: TokenValue[];
    rawObject: Record<string, AnyToken>;
    rawArray: AnyToken[];
};

export type TokenValue<T extends keyof TokenTypeMap = keyof TokenTypeMap> = TokenTypeMap[T];

export const WordRegex = /^[a-zA-Z~_^!][a-zA-Z~_^!\d]*/;

export type AnyToken = Token | SelectorToken;

export class Token<T extends TokenType = TokenType> {
    raw: string;
    rawText: string;
    yes = 1;

    constructor(public text: string, public start: number, public end: number, public type: T, public value: TokenValue<T>) {
        this.raw = text.substring(start, end);
        this.rawText = this.raw;
        if (this.type === "text") this.rawText = this.value;
    };

    toJSON() {
        switch (this.type) {
            case "number":
            case "object":
            case "array":
            case "text":
            case "bool":
                return this.value;
            case "range":
            case "selector":
                throw new Error("Cannot serialize ranges and selectors.");
            case "rawArray":
                return (<TokenValue<"rawArray">>this.value).map(i => i.toJSON());
            case "rawObject":
                const val = <TokenValue<"rawObject">>this.value;
                const obj = {};
                for (const k in val) {
                    obj[k] = val[k].toJSON();
                }
                return obj;
        }
    };

    equalsValue(value: any) {
        switch (this.type) {
            case "number":
            case "text":
            case "bool":
                return this.value === value;
            case "selector":
                throw new Error("Cannot compare selectors.");
            case "range":
                return typeof value === "number"
                    && !isNaN(value)
                    && value >= this.value[0]
                    && value <= this.value[1];
            case "object":
                return checkObject(this.value, value);
            case "array":
                return checkArray(this.value, value);
            case "rawArray":
                const arr = <TokenValue<"rawArray">>this.value;
                for (let i = 0; i < arr.length; i++) {
                    if (!arr[i].equalsValue(value[i])) return false;
                }
                return true;
            case "rawObject":
                const obj = <TokenValue<"rawObject">>this.value;
                for (const k in obj) {
                    if (!obj[k].equalsValue(value[k])) return false;
                }
                return true;
        }
    };

    static bool(text: string, start: number, end: number, value: boolean): Token<"bool"> {
        return new Token(text, start, end, "bool", value);
    };

    static text(text: string, start: number, end: number, value: string): Token<"text"> {
        return new Token(text, start, end, "text", value);
    };

    static number(text: string, start: number, end: number, value: number): Token<"number"> {
        return new Token(text, start, end, "number", value);
    };

    static range(text: string, start: number, end: number, value: [number, number]): Token<"range"> {
        return new Token(text, start, end, "range", value);
    };

    static object(text: string, start: number, end: number, value: Record<string, TokenValue>): Token<"object"> {
        return new Token(text, start, end, "object", value);
    };

    static array(text: string, start: number, end: number, value: TokenValue[]): Token<"array"> {
        return new Token(text, start, end, "array", value);
    };

    static rawObject(text: string, start: number, end: number, value: Record<string, Token>): Token<"rawObject"> {
        return new Token(text, start, end, "rawObject", value);
    };

    static rawArray(text: string, start: number, end: number, value: Token[]): Token<"rawArray"> {
        return new Token(text, start, end, "rawArray", value);
    };
}

export class SelectorToken extends Token<SelectorTagName> {
    constructor(text: string, start: number, end: number, value: SelectorTagName, public filters: TokenValue<"rawObject">) {
        super(text, start, end, "selector", value);
    };
}

export function readBool(text: string, index: number): Token<"bool"> | null {
    if (text.substring(index, index + 4) === "true") return Token.bool(text, index, index + 4, true);
    if (text.substring(index, index + 5) === "false") return Token.bool(text, index, index + 5, false);

    return null;
}

export function readSelector(text: string, index: number): SelectorToken {
    if (text[index] !== "@" || !SelectorTags.includes(text[index + 1])) return null;

    if (text[index + 2] === "{") {
        const args = readObject(text, index + 2, false, true);
        return new SelectorToken(text, index, args.end, text[index + 1], args.value);
    } else if (text[index + 2] && text[index + 2] !== " ") return null;
    return new SelectorToken(text, index, index + 1, text[index + 1], {});
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

    throw new Error(`Unclosed string at ${startIndex + 1}th character`);
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
    if (isNaN(text[index] * 1)) return null; // Only allowing X and X.X syntax for numbers.
    const word = readWord(text, index, /^-?(\d+)|-?(\d+\.\d+)/);
    return Token.number(text, word.start, word.end, parseFloat(word.value));
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

    if (text[index] !== "." && text[++index] !== ".") return null;

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
    raw: isRaw): isRaw extends true ? Token<"rawObject"> : Token<"object"> {
    const char = text[index];
    if (char !== "{") return null;

    const object: Record<string, any> = {};
    const startIndex = index;
    index++;
    index = skipWhitespace(text, index);
    for (let i = index; i < text.length;) {
        const char = text[i];
        if (char === "}") return <any>new Token(text, startIndex, i + 1, raw ? "rawObject" : "object", object);
        if (char === ",") {
            i++;
            continue;
        }
        i = skipWhitespace(text, i);

        const key = readWordOrString(text, i);
        if (!key || (key.type === "text" && !key.value)) {
            throw new Error(`Unexpected character '${text[i]}' at ${i + 1}th character`);
        }
        if (!key.value) {
            throw new Error(`Empty key at ${i + 1}th character`);
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
            throw new Error(`Unexpected character '${text[i]}' at ${i + 1}th character`);
        }
        i = skipWhitespace(text, value.end);
        if (not) value.yes = 0;
        object[key.value] = raw ? <any>value : value.value;
    }

    throw new Error(`Unclosed object at ${startIndex + 1}th character`)
}

export function readArray<isRaw extends boolean>(
    text: string, index: number, allowSelector = false,
    raw: isRaw): isRaw extends true ? Token<"rawArray"> : Token<"array"> {
    const char = text[index];
    if (char !== "[") return null;

    const array = [];
    const startIndex = index;
    index++;

    for (let i = index; i < text.length; i++) {
        const char = text[i];
        if (char === "]") return <any>new Token(text, startIndex, i + 1, raw ? "rawArray" : "array", array);

        const value = (allowSelector ? readSelector(text, i) : null) || readAny(text, i, allowSelector, raw);
        if (!value) throw new Error(`Invalid value at ${i + 1}th character`);
        i = skipWhitespace(text, value.end);
        array.push(raw ? value : value.value);
    }

    throw new Error(`Unclosed array at ${startIndex + 1}th character`)
}

export function skipWhitespace(text: string, index: number) {
    return readWord(text, index, /^\s+/).end;
}

// List of possible results:
// "Hello, world!" {type: "text", value: "Hello, world!", index: 10}
// true {type: "bool", value: true, index: 10}
// 25 {type: "number", value: 25, index: 10}
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
    return text.replaceAll(/[\x00-\x1f\x7f-\xa6\xa8-\uffff]/g, "").trim();
}