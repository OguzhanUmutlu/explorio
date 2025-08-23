import {Entity} from "@/entity/Entity";

export abstract class Effect {
    abstract typeId: number;
    abstract typeName: string;
    abstract name: string;

    abstract apply(entity: Entity, amplifier: number): void;

    timeout(_entity: Entity): void {
    };
}