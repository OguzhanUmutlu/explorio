// @a - all players in all worlds
// @p - closest player to the sender's position
// @r - random player
// @s - sender
// @e - every entity in all worlds

export const SelectorTags = ["a", "p", "r", "s", "e"] as const;
export type SelectorTagName = typeof SelectorTags[number];
export type TokenType =
    "word"
    | "string"
    | "number"
    | "bool"
    | "selector"
    | "object"
    | "array"
    | "rawObject"
    | "rawArray";
type TokenTypeMap = {
    word: string;
    string: string;
    number: number;
    bool: boolean;
    selector: SelectorTagName;
    object: Record<string, TokenValue>;
    array: TokenValue[];
    rawObject: Record<string, Token>;
    rawArray: Token[];
};

export type TokenValue<T extends keyof TokenTypeMap = keyof TokenTypeMap> = TokenTypeMap[T];

export const WordRegex = /^[a-zA-Z~_^!][a-zA-Z~_^!\d]*/;

export class Token<T extends TokenType = any> {
    raw: string;
    rawText: string;

    constructor(public text: string, public start: number, public end: number, public type: T, public value: TokenValue<T>) {
        this.raw = text.substring(start, end);
        this.rawText = this.raw;
        if (this.type === "string") this.rawText = this.value;
    };

    static bool(text: string, start: number, end: number, value: boolean): Token<"bool"> {
        return new Token(text, start, end, "bool", value);
    };

    static string(text: string, start: number, end: number, value: string): Token<"string"> {
        return new Token(text, start, end, "string", value);
    };

    static word(text: string, start: number, end: number, value: string): Token<"word"> {
        return new Token(text, start, end, "word", value);
    };

    static number(text: string, start: number, end: number, value: number): Token<"number"> {
        return new Token(text, start, end, "number", value);
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
    constructor(text: string, start: number, end: number, value: SelectorTagName, public args: TokenValue<"rawObject">) {
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
        const args = readObject(text, index + 2, true, true);
        return new SelectorToken(text, index, args.end, text[index + 1], args.value);
    } else if (text[index + 2] && text[index + 2] !== " ") return null;
    return new SelectorToken(text, index, index + 1, text[index + 1], {});
}

export function readString(text: string, index: number): Token<"string"> | null {
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
            return Token.string(text, startIndex, i + 1, value);
        }

        value += text[i];
    }

    throw new Error(`Unclosed string at ${startIndex + 1}th character`);
}

export function readWord(text: string, index: number, regex: RegExp = WordRegex): Token<"word"> {
    const match = text.substring(index).match(regex);
    if (!match) return Token.word(text, index, index, "");
    const word = match[0];
    return Token.word(text, index, index + word.length, word);
}

export function readWordOrString(text: string, index: number, regex: RegExp = WordRegex) {
    if (text[index] !== "\"" && text[index] !== "'") return readWord(text, index, regex);

    return readString(text, index);
}

export function readNumber(text: string, index: number) {
    if (isNaN(text[index] * 1)) return null; // Only allowing X and X.X syntax for numbers.
    const word = readWord(text, index, /^(\d+)|(\d+\.\d+)/);
    return Token.number(text, word.start, word.end, parseFloat(word.value));
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
        if (!key || (key.type === "word" && !key.value)) {
            throw new Error(`Unexpected character '${text[i]}' at ${i + 1}th character`);
        }
        if (!key.value) {
            throw new Error(`Empty key at ${i + 1}th character`);
        }

        i = skipWhitespace(text, key.end);

        if (text[i] !== ":" && text[i] !== "=") throw new Error(`Missing colon(or equals sign) at ${i + 1}th character`);
        i++;
        i = skipWhitespace(text, i);

        const value = (allowSelector ? readSelector(text, i) : null) || readAny(text, i, allowSelector, raw);
        if (!value || (value.type === "word" && !value.value)) {
            throw new Error(`Unexpected character '${text[i]}' at ${i + 1}th character`);
        }
        i = skipWhitespace(text, value.end);
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
// "Hello, world!" {type: "string", value: "Hello, world!", index: 10}
// true {type: "bool", value: true, index: 10}
// 25 {type: "number", value: 25, index: 10}
// {x=10 y=20} {type: "object", value: {x: 10, y: 20}, index: 10}
// [10 20] {type: "array", value: [10, 20], index: 10}
// @a{x=20} {type: "selector", value: "a", arguments: {x: {type:"number",value:20}}, index: 10}
// Hello {type: "word", value: "Hello", index: 10}
export function readAny(text: string, index: number, allowSelector = false, raw = false) {
    return readString(text, index)
        || readBool(text, index)
        || readNumber(text, index)
        || readObject(text, index, allowSelector, raw)
        || readArray(text, index, allowSelector, raw)
        || readWord(text, index);
}

// Splits the given command parameters
// Input: @a{x=10, y=10} "hello, world!" hello, world!
// Output: [{selector: "a", arguments: {x: 10, y: 20}}, "hello, world!", "hello,", "world!"]
export function splitParameters(params: string) {
    const args: Token[] = [];

    for (let i = 0; i < params.length; i++) {
        i = skipWhitespace(params, i);
        const token = readSelector(params, i) || readAny(params, i);
        if (!token) break;
        args.push(token);
        i = token.end;
    }

    return args;
}

export function cleanText(text: string) {
    return text.replaceAll(/[\x00-\x1f\x7f-\xa6\xa8-\uffff]/g, "").trim();
}