import {Entity} from "@explorio/entity/Entity";

export abstract class Effect {
    abstract id: number;
    abstract apply(entity: Entity, amplifier: number): void;
    abstract remove(entity: Entity): void;
}