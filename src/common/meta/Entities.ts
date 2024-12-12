import BoundingBox from "@/entity/BoundingBox";
import {ClassOf} from "@/utils/Utils";
import Entity from "@/entity/Entity";

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

export const EntityNameMap = {
    player: Entities.PLAYER,
    item: Entities.ITEM
} as const;

export const EntityClasses = <Record<Entities, ClassOf<Entity>>>{};
