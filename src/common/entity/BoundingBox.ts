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

    collidesBlock(x: number, y: number) {
        return (
            this.x < x + 0.5 &&
            this.x + this.width > x - 0.5 &&
            this.y < y + 0.5 &&
            this.y + this.height > y - 0.5
        );
    };

    copy() {
        return new BoundingBox(this.x, this.y, this.width, this.height);
    };
}