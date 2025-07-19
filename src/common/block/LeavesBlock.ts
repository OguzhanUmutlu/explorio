import BlockData from "@/item/BlockData";
import {createCanvas, Image} from "@/utils/Texture";
import {TreeType} from "@/meta/ItemInformation";

export default class LeavesBlock extends BlockData {
    postProcessesTexture = true;

    beginPostProcessTexture(image: Image): CanvasRenderingContext2D {
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "rgba(0, 0, 0, 0)";
        ctx.fillRect(0, 0, image.width, image.height);

        if (this.meta < TreeType.PaleOak) {
            const canvas2 = createCanvas(image.width, image.height);
            const ctx2 = canvas2.getContext("2d");
            ctx2.drawImage(image, 0, 0);
            ctx2.globalCompositeOperation = "source-atop";
            ctx2.fillStyle = "rgba(0, 119, 0, 0.5)";
            ctx2.fillRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(canvas2, 0, 0);
        } else ctx.drawImage(image, 0, 0);

        return ctx;
    };
}
