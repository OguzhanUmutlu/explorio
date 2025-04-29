import Entity from "@/entity/Entity";


export default abstract class Effect {
    abstract typeId: number;
    abstract typeName: string;
    abstract name: string;

    abstract apply(entity: Entity, amplifier: number): void;
    abstract remove(entity: Entity): void;
}