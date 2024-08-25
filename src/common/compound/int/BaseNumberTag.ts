import {Tag} from "../Tag";

export abstract class BaseNumberTag extends Tag {
    constructor(public value: number) {
        super();
        this.apply(value);
    };

    check(num: any) {
        return !isNaN(num) && typeof num === "number";
    };

    apply(num: any) {
        if (!this.check(num)) throw new Error("Tried to apply an invalid number to a number-based tag");
        this.value = num;
        return this;
    };

    clone() {
        return new (<any>this.constructor)(this.value);
    };
}