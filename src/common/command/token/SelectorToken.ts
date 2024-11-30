import Token from "$/command/token/Token";
import {SelectorTagName, TokenValue} from "$/command/CommandProcessor";

export default class SelectorToken extends Token<"selector"> {
    constructor(text: string, start: number, end: number, value: SelectorTagName, public filters: TokenValue<"rawObject">) {
        super(text, start, end, "selector", value);
    };
}