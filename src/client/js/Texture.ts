const imagePlaceholder = createCanvas();
const invalidImage = createCanvas();
if (typeof document !== "undefined") {
    const invalidCtx = invalidImage.getContext("2d");
    invalidImage.width = 2;
    invalidImage.height = 2;
    invalidCtx.fillStyle = "#000000";
    invalidCtx.fillRect(0, 0, 1, 1);
    invalidCtx.fillRect(1, 1, 1, 1);
    invalidCtx.fillStyle = "#d000d2";
    invalidCtx.fillRect(0, 1, 1, 1);
    invalidCtx.fillRect(1, 0, 1, 1);
}

// TODO: Resize the textures to TILE_SIZE x TILE_SIZE when created? It may break item rendering though.

// BASED ON 64x64
const SKIN_PARTS = {
    head: [[0, 8, 8, 8], [16, 8, 8, 8]],
    head_topping: [[32, 8, 8, 8], [48, 8, 8, 8]],

    body: [[16, 20, 4, 12], [28, 20, 4, 12]],

    front_arm: [[40, 20, 4, 12], [40, 52, 4, 12]],
    back_arm: [[32, 52, 4, 12], [48, 20, 4, 12]],

    front_leg: [[0, 20, 4, 12], [24, 52, 4, 12]],
    back_leg: [[16, 52, 4, 12], [8, 20, 4, 12]]
};

type Canvas = HTMLCanvasElement;
type Image = HTMLImageElement;

function createCanvas(): Canvas {
    return typeof document === "undefined" ? null : document.createElement("canvas");
}

function cropImage(image: Canvas | Image, x: number, y: number, width: number, height: number) {
    const canvas = createCanvas();
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
    return canvas;
}

function copyImage(image: Canvas | Image) {
    const canvas = createCanvas();
    const ctx = canvas.getContext("2d");
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    return canvas;
}

function eraseImage(image: Canvas | Image, x: number, y: number, width: number, height: number) {
    const canvas = copyImage(image);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(x, y, width, height);
    return canvas;
}

function loadImage(src: string): Promise<Image> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}

export class Texture {
    static textures: Record<string, Texture> = {};

    image: Canvas | Image = imagePlaceholder;
    _flipped: [Canvas, Canvas] = [null, null];
    _rotated: Record<number, Canvas> = {};
    _skin: Record<keyof typeof SKIN_PARTS, Canvas>[];
    _promise: Promise<Image>;
    _actualSrc: string;
    _slabTop: Canvas | null = null;
    _slabBottom: Canvas | null = null;
    _stairsTopLeft: Canvas | null = null; // removes top left part of the block
    _stairsTopRight: Canvas | null = null;
    _stairsBottomLeft: Canvas | null = null;
    _stairsBottomRight: Canvas | null = null;

    constructor(actualSrc: string) {
        if (actualSrc === "") {
            this.image = imagePlaceholder;
            return;
        }
        this._promise = loadImage(actualSrc);
        this._promise.then(image => {
            this.image = image;
        }).catch(() => {
            console.log("%cFailed to load " + actualSrc, "color: #ff0000");
            this.image = invalidImage;
        });
        const path = [];
        for (const p of actualSrc.split("/")) {
            if (p === "..") {
                path.pop();
            } else if (p !== "." && p !== "") {
                path.push(p);
            }
        }
        this._actualSrc = path.join("/");
    };

    destroy() {
        delete Texture.textures[this._actualSrc];
        delete this._flipped;
        delete this.image;
        delete this._rotated;
        delete this._skin;
    };

    get loaded() {
        return this.image !== imagePlaceholder;
    };

    static flipImage(image: Canvas | Image, way = 1) {
        const canvas = createCanvas();
        const ctx = canvas.getContext("2d");
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.save();
        ctx.translate(canvas.width, 0);
        if (way === 1) ctx.scale(-1, 1);
        else ctx.scale(1, -1);
        ctx.drawImage(image, 0, 0);
        ctx.restore();
        return canvas;
    };

    static rotateImage(image: Canvas | Image, degrees = 90) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(image, -canvas.width / 2, -canvas.height / 2);
        ctx.restore();
        return canvas;
    };

    static readSkin(image: Canvas | Image) {
        const dim = image.width / 64;
        const sides = [{}, {}];
        for (const name in SKIN_PARTS) {
            const part = SKIN_PARTS[name];
            for (let i = 0; i < 2; i++) {
                sides[i][name] = cropImage(image, part[i][0] * dim, part[i][1] * dim, part[i][2] * dim, part[i][3] * dim);
            }
        }
        return <Record<keyof typeof SKIN_PARTS, Canvas>[]>sides;
    };

    static get(src: string) {
        if (!src) return texturePlaceholder;
        if (Texture.textures[src]) return Texture.textures[src];
        const startMs = performance.now();
        if (!src) throw new Error("Invalid texture src.");
        return Texture.textures[src] = new Texture(src);
    };

    flip(way = 1) {
        if (!this.loaded) return imagePlaceholder;
        return this._flipped[way] ??= Texture.flipImage(this.image, way);
    };

    rotate(degrees = 90) {
        if (!this.loaded) return imagePlaceholder;
        return this._rotated[degrees] ??= Texture.rotateImage(this.image, degrees);
    };

    slabTop() {
        if (!this.loaded) return imagePlaceholder;
        return this._slabTop ||= eraseImage(this.image, 0, 0, this.image.width, this.image.height / 2);
    };

    slabBottom() {
        if (!this.loaded) return imagePlaceholder;
        return this._slabBottom ||= eraseImage(this.image, 0, this.image.height / 2, this.image.width, this.image.height / 2);
    };

    stairsTopLeft() {
        if (!this.loaded) return imagePlaceholder;
        return this._stairsTopLeft ||= eraseImage(this.image, 0, 0, this.image.width / 2, this.image.height / 2);
    };

    stairsTopRight() {
        if (!this.loaded) return imagePlaceholder;
        return this._stairsTopRight ||= eraseImage(this.image, this.image.width / 2, 0, this.image.width / 2, this.image.height / 2);
    };

    stairsBottomLeft() {
        if (!this.loaded) return imagePlaceholder;
        return this._stairsBottomLeft ||= eraseImage(this.image, 0, this.image.height / 2, this.image.width / 2, this.image.height / 2);
    };

    stairsBottomRight() {
        if (!this.loaded) return imagePlaceholder;
        return this._stairsBottomRight ||= eraseImage(this.image, this.image.width / 2, this.image.height / 2, this.image.width / 2, this.image.height / 2);
    };

    skin() {
        if (!this.loaded) return null;
        return this._skin ??= Texture.readSkin(this.image);
    };

    async wait() {
        await this._promise;
    };
}

const
    texturePlaceholder = new Texture("");