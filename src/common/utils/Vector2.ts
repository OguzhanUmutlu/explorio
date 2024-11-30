export default class Vector2 {
    constructor(public x: number, public y: number) {
    };

    set(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
    };

    add(x: number, y: number) {
        this.x += x;
        this.y += y;
        return this;
    };

    sub(x: number, y: number) {
        this.x -= x;
        this.y -= y;
        return this;
    };

    mul(x: number, y: number) {
        this.x *= x;
        this.y *= y;
        return this;
    };

    div(x: number, y: number) {
        this.x /= x;
        this.y /= y;
        return this;
    };

    dot(x: number, y: number) {
        return this.x * x + this.y * y;
    };

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    };

    normalize() {
        const len = this.length();
        return this.div(len, len);
    };

    copy() {
        return new Vector2(this.x, this.y);
    };
}