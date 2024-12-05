export default class BoundingBox {
    constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number
    ) {
    };

    contains(x: number, y: number) {
        return (
            x > this.x &&
            x < this.x + this.width &&
            y > this.y &&
            y < this.y + this.height
        );
    };

    collides(b: BoundingBox) {
        return (
            this.x < b.x + b.width &&
            this.x + this.width > b.x &&
            this.y < b.y + b.height &&
            this.y + this.height > b.y
        );
    };

    collidesGiven(x: number, y: number, w: number, h: number) {
        return (
            this.x < x + w &&
            this.x + this.width > x &&
            this.y < y + h &&
            this.y + this.height > y
        );
    };

    expand(mx: number, my: number) {
        this.x -= (mx - 1) / 2 * this.width;
        this.y -= (my - 1) / 2 * this.height;
        this.width *= mx;
        this.height *= my;
        return this;
    };

    setBB(bb: BoundingBox) {
        this.x = bb.x;
        this.y = bb.y;
        this.width = bb.width;
        this.height = bb.height;
        return this;
    };

    copy() {
        return new BoundingBox(this.x, this.y, this.width, this.height);
    };
}