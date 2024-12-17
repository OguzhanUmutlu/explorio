import {checkArray, checkObject} from "@/utils/Utils";
import {TokenType, TokenValue} from "@/command/CommandProcessor";

export default class Token<T extends TokenType = TokenType> {
    raw: string;
    rawText: string;
    yes = 1;

    constructor(public originalText: string, public start: number, public end: number, public type: T, public value: TokenValue<T>) {
        this.raw = originalText.substring(start, end);
        this.rawText = this.raw;
        if (this.type === "text") this.rawText = <string>this.value;
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
            case "rawObject": {
                const val = <TokenValue<"rawObject">>this.value;
                const obj = {};
                for (const k in val) {
                    obj[k] = val[k].toJSON();
                }
                return obj;
            }
        }
    };

    equalsValue(value: unknown) {
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
                return checkObject(<object>this.value, value);
            case "array":
                return checkArray(<unknown[]>this.value, value);
            case "rawArray": {
                const arr = <TokenValue<"rawArray">>this.value;
                for (let i = 0; i < arr.length; i++) {
                    if (!arr[i].equalsValue(value[i])) return false;
                }
                return true;
            }
            case "rawObject": {
                const obj = <TokenValue<"rawObject">>this.value;
                for (const k in obj) {
                    if (!obj[k].equalsValue(value[k])) return false;
                }
                return true;
            }
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