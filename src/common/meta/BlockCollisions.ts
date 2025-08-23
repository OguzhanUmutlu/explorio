import {BoundingBox} from "@/entity/BoundingBox";

export const BaseBlockBB = [new BoundingBox(0, 0, 1, 1)];

export const SlabTopBB = [new BoundingBox(0, 0.5, 1, 0.5)];
export const SlabBottomBB = [new BoundingBox(0, 0, 1, 0.5)];
export const SlabLeftBB = [new BoundingBox(0, 0, 0.5, 1)];
export const SlabRightBB = [new BoundingBox(0.5, 0, 0.5, 1)];

// stairs are cut. left top means its left top corner is cut and the rest is rendered.
export const StairsLeftTopBB = [
    new BoundingBox(0.5, 0, 0.5, 1),
    new BoundingBox(0, 0, 1, 0.5)
];
export const StairsRightTopBB = [
    new BoundingBox(0, 0, 0.5, 1),
    new BoundingBox(0, 0, 1, 0.5)
];
export const StairsLeftBottomBB = [
    new BoundingBox(0, 0.5, 1, 0.5),
    new BoundingBox(0.5, 0, 0.5, 1)
];
export const StairsRightBottomBB = [
    new BoundingBox(0, 0, 0.5, 1),
    new BoundingBox(0, 0.5, 1, 0.5)
];