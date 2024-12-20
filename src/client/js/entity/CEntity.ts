import Entity from "@/entity/Entity";

export default interface CEntity extends Entity {
    typeId: number;
    typeName: string;
    name: string;

    render(ctx: CanvasRenderingContext2D, dt: number): void;
    serverUpdate(dt: number): void;
}