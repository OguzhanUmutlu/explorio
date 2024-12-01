import {AnyToken} from "@/command/CommandProcessor";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";

export default abstract class CommandArgument<T = unknown> {
    __TYPE__: T;
    required = true;
    spread = false;
    abstract default: T;

    constructor(public name: string) {
    };

    getName() {
        return this.name;
    };

    getRequired() {
        return this.required;
    };

    getSpread() {
        return this.spread;
    };

    getDefault() {
        return this.default;
    };

    setName(name: string) {
        this.name = name;
        return this;
    };

    setRequired(required = true) {
        this.required = required;
        return this;
    };

    setOptional(optional = true) {
        this.required = !optional;
        return this;
    };

    setSpread(spread = true) {
        this.spread = spread;
        return this;
    };

    setDefault(defaultValue: T) {
        this.default = defaultValue;
        return this;
    };

    abstract read(as: CommandAs, at: Location, args: AnyToken[], index: number): T;
    abstract blindCheck(args: AnyToken[], index: number): { pass: boolean, index: number };

    abstract toString(): string;

    toUsageString() {
        return `${this.required ? "<" : "["}${this.spread ? "..." : ""}${this.name}: ${this.toString()}${this.required ? ">" : "]"}`;
    };
}