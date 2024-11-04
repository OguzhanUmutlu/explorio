import {Entity} from "../../../common/entity/Entity";
import {CWorld} from "../world/CWorld";

export interface CEntity extends Entity<CWorld> {
    typeId: number;
    typeName: string;
    name: string;

    serverUpdate(dt: number): void;
}