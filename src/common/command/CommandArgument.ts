import {Token} from "./CommandProcessor";
import {CommandSender} from "./CommandSender";
import {RotatedPosition} from "../utils/RotatedPosition";

export abstract class CommandArgument<T extends any = any> {
    __TYPE__: T;
    required = true;
    spread = false;

    protected constructor(public name: string) {
    };

    setName(name: string) {
        this.name = name;
        return this;
    };

    setRequired(required = true) {
        this.required = required;
        return this;
    };

    setSpread(spread = true) {
        this.spread = spread;
        return this;
    };

    abstract read(as: CommandSender, at: RotatedPosition, args: Token[], index: number): { value: T, index: number };
    abstract blindCheck(args: Token[], index: number): { pass: boolean, index: number };

    abstract toString(): string;
}