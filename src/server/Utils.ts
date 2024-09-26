import {Entities, EntityClasses} from "../common/meta/Entities";
import {SPlayer} from "./entity/SPlayer";
import {initCommon} from "../common/utils/Inits";

export function initServerThings() {
    initCommon();
    initServerEntities();
}

export function initServerEntities() {
    EntityClasses[Entities.PLAYER] = SPlayer;
}