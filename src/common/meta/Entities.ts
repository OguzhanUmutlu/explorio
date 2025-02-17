import BoundingBox from "@/entity/BoundingBox";
import {ClassOf} from "@/utils/Utils";
import Entity from "@/entity/Entity";

export enum EntityIds {
    PLAYER,
    ITEM,
    XP_ORB,
    __MAX__
}

export const EntityBoundingBoxes: Record<number, BoundingBox> = {
    [EntityIds.PLAYER]: new BoundingBox(0, 0, 0.5, 1.8),
    [EntityIds.ITEM]: new BoundingBox(0, 0, 0.25, 0.25),
    [EntityIds.XP_ORB]: new BoundingBox(0, 0, 0.25, 0.25)
};

export const EntityNameMap: Record<string, EntityIds> = {};

export const EntityClasses = <Record<EntityIds, ClassOf<Entity>>>{};
