import {Entity} from "../../../common/entity/Entity";
import {CWorld} from "../world/CWorld";
import {BoundingBox} from "../../../common/BoundingBox";

export interface CEntity extends Entity<CWorld> {
    render(): void;
    serverUpdate(dt: number): void;
}