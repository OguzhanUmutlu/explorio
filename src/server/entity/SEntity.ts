import {Entity} from "../../common/entity/Entity";
import {SWorld} from "../world/SWorld";

export interface SEntity extends Entity<SWorld> {
    serverUpdate(dt: number): void;
}