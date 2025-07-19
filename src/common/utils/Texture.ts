import {simplifyTexturePath} from "@/utils/Utils";

const pseudoCanvas = <Canvas><unknown>{getContext: () => ({fillRect: () => 0})};

let nodeCanvas = <{
    createCanvas(w: number, h: number): Canvas,
    loadImage(url: string): Promise<Image>
}>null;
try {
    if (typeof process !== "undefined" && process.versions?.node) {
        // eslint-disable-next-line
        // @ts-ignore
        nodeCanvas = await import(/* @vite-ignore */ JSON.parse('"canvas"'));
    }
// eslint-disable-next-line
} catch {
}

export const imagePlaceholder = createCanvas(1, 1);
export const invalidImage = createCanvas(2, 2);
const invalidCtx = invalidImage.getContext("2d");
invalidCtx.fillStyle = "#000000";
invalidCtx.fillRect(0, 0, 1, 1);
invalidCtx.fillRect(1, 1, 1, 1);
invalidCtx.fillStyle = "#d000d2";
invalidCtx.fillRect(0, 1, 1, 1);
invalidCtx.fillRect(1, 0, 1, 1);

export type SkinData = Record<keyof typeof SKIN_PARTS, Canvas>[];

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

export type Canvas = HTMLCanvasElement;
export type Image = HTMLImageElement | Canvas;

export function createCanvas(width: number, height: number): Canvas {
    if (typeof document === "undefined") {
        return nodeCanvas ? nodeCanvas.createCanvas(width, height) : pseudoCanvas;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

export function cropImage(image: Canvas | Image, x: number, y: number, width: number, height: number) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
    return canvas;
}

export function copyImage(image: Canvas | Image) {
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    return canvas;
}

export function eraseImage(image: Canvas | Image, x: number, y: number, width: number, height: number) {
    const canvas = copyImage(image);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(x, y, width, height);
    return canvas;
}

function loadImage(src: string): Promise<Image> {
    return new Promise((resolve, reject) => {
        if (typeof global === "undefined") {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = src;
        } else {
            nodeCanvas.loadImage(src).then((image: Image) => resolve(image)).catch(reject);
        }
    });
}

export default class Texture {
    static textures: Record<string, Texture> = {};

    image: Canvas | Image = imagePlaceholder;
    _promise: Promise<Image>;

    _flipped: [Canvas, Canvas] = [null, null];
    _rotated: Record<number, Canvas> = {};
    _skin: Record<keyof typeof SKIN_PARTS, Canvas>[];
    _slabTop: Canvas | null = null;
    _slabBottom: Canvas | null = null;
    _slabRight: Canvas | null = null;
    _slabLeft: Canvas | null = null;
    _stairsTopLeft: Canvas | null = null; // removes top left part of the block
    _stairsTopRight: Canvas | null = null;
    _stairsBottomLeft: Canvas | null = null;
    _stairsBottomRight: Canvas | null = null;
    _pixels: Canvas[] = [];
    _pixelValues: string[] = [];
    _boundaries: { left: number, right: number, top: number, bottom: number } | null = null;

    constructor(public actualSrc: string, known?: Promise<Canvas | Image> | Canvas | Image | null) {
        if (this.actualSrc.endsWith("undefined.png")) throw new Error("not cool, report this")
        this.actualSrc = simplifyTexturePath(this.actualSrc);

        if (!known || known instanceof Promise) {
            this._promise = (<Promise<Image>>known || loadImage(this.actualSrc))
                .then((image: Image) => {
                    this.image = image;
                    printer.debug("%cLoaded " + this.actualSrc, "color: #00ff00");
                    return image;
                }).catch(() => {
                    printer.error("%cFailed to load " + this.actualSrc, "color: #ff0000");
                    return this.image = invalidImage;
                });
        } else {
            this.image = known;
        }
    };

    get width() {
        return this.image ? this.image.width : 0;
    };

    get height() {
        return this.image ? this.image.height : 0;
    };

    getOpaqueBoundaries() {
        if (!this.image || this._boundaries) return this._boundaries ?? {left: 0, right: 0, top: 0, bottom: 0};
        const canvas = createCanvas(this.image.width, this.image.height);
        canvas.width = this.image.width;
        canvas.height = this.image.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(this.image, 0, 0);

        const {data, width, height} = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let top = height, bottom = 0, left = width, right = 0;
        let found = false;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const alpha = data[idx + 3];
                if (alpha !== 0) {
                    found = true;
                    if (x < left) left = x;
                    if (x > right) right = x;
                    if (y < top) top = y;
                    if (y > bottom) bottom = y;
                }
            }
        }

        if (!found) return this._boundaries = {left: 0, right: 0, top: 0, bottom: 0};

        return this._boundaries = {left, right, top, bottom};
    };

    destroy() {
        delete Texture.textures[this.actualSrc];
        delete this._flipped;
        delete this.image;
        delete this._rotated;
        delete this._skin;
    };

    get loaded() {
        return this.image !== imagePlaceholder;
    };

    static flipImage(image: Canvas | Image, way = 1) {
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        ctx.translate(canvas.width, 0);
        if (way === 1) ctx.scale(-1, 1);
        else ctx.scale(1, -1);
        ctx.drawImage(image, 0, 0);
        ctx.restore();
        return canvas;
    };

    static rotateImage(image: Canvas | Image, degrees = 90) {
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
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
        return <SkinData>sides;
    };

    static get(src: string) {
        if (!src) return texturePlaceholder;
        if (Texture.textures[src]) return Texture.textures[src];
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
        return this._slabTop ||= eraseImage(this.image, 0, this.image.height / 2, this.image.width, this.image.height / 2);
    };

    slabBottom() {
        if (!this.loaded) return imagePlaceholder;
        return this._slabBottom ||= eraseImage(this.image, 0, 0, this.image.width, this.image.height / 2);
    };

    slabRight() {
        if (!this.loaded) return imagePlaceholder;
        return this._slabRight ||= eraseImage(this.image, 0, 0, this.image.width / 2, this.image.height);
    };

    slabLeft() {
        if (!this.loaded) return imagePlaceholder;
        return this._slabLeft ||= eraseImage(this.image, this.image.width / 2, 0, this.image.width / 2, this.image.height);
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

    pixel(x: number, y: number) {
        if (!this.loaded) return null;
        const i = x + y * this.image.width;
        if (this._pixels[i]) return this._pixels[i];
        const canvas = createCanvas(1, 1);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(this.image, x, y, 1, 1, 0, 0, 1, 1);
        return this._pixels[i] = canvas;
    };

    pixelValue(x: number, y: number) {
        if (!this.loaded) return null;
        const i = x + y * this.image.width;
        if (this._pixelValues[i]) return this._pixelValues[i];
        const canvas = createCanvas(1, 1);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(this.image, x, y, 1, 1, 0, 0, 1, 1);
        return this._pixelValues[i] = "#" + Array.from(ctx
            .getImageData(0, 0, 1, 1)
            .data
            .slice(0, 3))
            .map((i: number) => i.toString(16).padStart(2, "0"))
            .join("");
    };

    async wait() {
        await this._promise;
        return this.image;
    };
}

export const texturePlaceholder = new Texture("", imagePlaceholder);