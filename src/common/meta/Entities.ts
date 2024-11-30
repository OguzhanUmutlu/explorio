import BoundingBox from "$/entity/BoundingBox";

export enum Entities {
    UNKNOWN,
    PLAYER,
    ITEM,
    __MAX__
}

export const EntityBoundingBoxes: Record<number, BoundingBox> = {
    [Entities.PLAYER]: new BoundingBox(0, 0, 0.5, 1.8),
    [Entities.ITEM]: new BoundingBox(0, 0, 0.3, 0.3)
};

export const EntityClasses: Record<Entities, any> = <any>{};
