import {Entities, EntityClasses} from "../common/meta/Entities";
import {initCommon} from "../common/utils/Inits";
import {Player} from "../common/entity/types/Player.js";

export function initServerThings() {
    initCommon();
    initServerEntities();
}

export function initServerEntities() {
    EntityClasses[Entities.PLAYER] = Player;
}