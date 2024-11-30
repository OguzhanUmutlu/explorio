import Entity from "$/entity/Entity";

export default abstract class Effect {
    abstract id: number;
    abstract apply(entity: Entity, amplifier: number): void;
    abstract remove(entity: Entity): void;
}