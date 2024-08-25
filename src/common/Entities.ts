import {BoundingBox} from "./BoundingBox";

export const Entities = {
    UNKNOWN: 0,
    PLAYER: 1
};

export const EntityBoundingBoxes: Record<number, BoundingBox> = {
    [Entities.PLAYER]: new BoundingBox(0, 0, 0.5, 1.8)
};