import {Attributes} from "../meta/Attributes";
import {BoundingBox} from "./BoundingBox";
import {World} from "../world/World";
import {SEntityUpdatePacket} from "../packet/server/SEntityUpdatePacket";
import {SEntityRemovePacket} from "../packet/server/SEntityRemovePacket";
import {isServer} from "../utils/Utils";
import {RotatedPosition} from "../utils/RotatedPosition";

export const DEFAULT_WALK_SPEED = 5;
export const DEFAULT_FLY_SPEED = 10;
export const DEFAULT_JUMP_VELOCITY = 7;
export const DEFAULT_GRAVITY = 18;

let _entity_id = 0;

export abstract class Entity<WorldType extends World = World> {
    abstract typeId: number;
    abstract name: string;
    id = _entity_id++;
    chunk: WorldType["chunkEntities"][number];
    _x = 0;
    _y = 0;
    position = new RotatedPosition(0, 0, 0);
    renderX = 0;
    renderY = 0;
    vx = 0;
    vy = 0;
    onGround = true;
    bb: BoundingBox;
    cacheState;
    server: WorldType["server"];

    get x() {
        return this.position.x;
    };

    get y() {
        return this.position.y;
    };

    get rotation() {
        return this.position.rotation;
    };

    set x(x: number) {
        this.position.x = x;
    };

    set y(y: number) {
        this.position.y = y;
    };

    set rotation(rotation: number) {
        this.position.rotation = rotation;
    };

    protected constructor(public world: WorldType) {
        this.server = world.server;
    };

    abstract getSaveData(): any;

    abstract loadFromData(data: any): void;

    init() {
        this.updateCacheState();
        this.onMovement();
        this.world.entities[this.id] = this;
    };

    calcCacheState(): string {
        return `${this.x.toFixed(2)};${this.y.toFixed(2)}`;
    };

    updateCacheState() {
        this.cacheState = this.calcCacheState();
    };

    render(dt: number) {
        this.renderX += (this.x - this.renderX) / 5;
        this.renderY += (this.y - this.renderY) / 5;
    };

    attributes = {
        [Attributes.WALK_SPEED]: DEFAULT_WALK_SPEED,
        [Attributes.FLY_SPEED]: DEFAULT_FLY_SPEED,
        [Attributes.JUMP_VELOCITY]: DEFAULT_JUMP_VELOCITY,
        [Attributes.HEALTH]: 20,
        [Attributes.FOOD]: 20,
        [Attributes.MAX_HEALTH]: 20,
        [Attributes.MAX_FOOD]: 20,
        [Attributes.GRAVITY]: 0,
        [Attributes.IS_FLYING]: 0,
        [Attributes.CAN_TOGGLE_FLY]: 0,
        [Attributes.CAN_PHASE]: 0,
        [Attributes.BLOCK_REACH]: 5,
        [Attributes.ATTACK_REACH]: 5,
        [Attributes.IMMOBILE]: false
    };

    calculateGround() { // used in the server-side
        this.y -= 0.01;
        const collisions = this.world.getBlockCollisions(this.bb, 1);
        this.y += 0.01;
        this.onGround = collisions.length === 0;
    };

    collidesBlock() {
        return this.world.getBlockCollisions(this.bb, 1).length > 0;
    };

    teleport(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.onMovement();
    };

    tryToMove(x: number, y: number) {
        if (this.immobile) return false;
        let already = this.collidesBlock();
        this.x += x;
        if (already) { // if it was already in a block, stop here
            this.onMovement();
            return false;
        }
        this.y += y;
        this.onMovement();
        if (this.collidesBlock()) {
            this.x -= x;
            this.y -= y;
            this.onMovement();
            return false;
        }
        return true;
    };

    update(dt: number) {
        let x = this.x, y = this.y;
        this.vx *= 0.999;
        this.vy *= 0.999;
        this.vy -= this.gravity * dt;
        const hitH = !this.tryToMove(this.vx * dt, 0);
        const hitV = !this.tryToMove(0, this.vy * dt);
        this.onGround = this.vy <= 0 && hitV;
        if (hitH) this.vx = 0;
        if (hitV) this.vy = 0;
        if (this.x !== x || this.y !== y) this.onMovement();
    };

    onMovement() {
        this._x = this.x;
        this._y = this.y;
        const oldChunk = this.chunk;
        const newChunk = this.world.getChunkEntitiesAt(this.x);
        if (oldChunk !== newChunk) {
            newChunk.push(this);
            if (oldChunk) {
                const index = oldChunk.indexOf(this);
                if (index !== -1) oldChunk.splice(index, 1);
            }
        }
        this.chunk = newChunk;
    };

    getMovementData(): any {
        return {
            x: this.x,
            y: this.y
        };
    };

    getSpawnData(): any {
        return this.getMovementData();
    };

    broadcastMovement() {
        if (isServer) {
            (<any>this.world).broadcastPacketAt(this.x, this.y, new SEntityUpdatePacket({
                entityId: this.id,
                typeId: this.typeId,
                props: this.getMovementData()
            }), [<any>this]);
        }
    };

    broadcastSpawn() {
        if (isServer) {
            (<any>this.world).broadcastPacketAt(this.x, this.y, new SEntityUpdatePacket({
                entityId: this.id,
                typeId: this.typeId,
                props: this.getSpawnData()
            }), [<any>this]);
        }
    };

    broadcastDespawn() {
        if (isServer) {
            (<any>this.world).broadcastPacketAt(this.x, this.y, new SEntityRemovePacket(this.id), [<any>this]);
        }
    };

    serverUpdate(dt: number): void {
        if (this.calcCacheState() !== this.cacheState) {
            this.updateCacheState();
            this.broadcastMovement();
        }
    };

    get walkSpeed() {
        return this.attributes[Attributes.WALK_SPEED];
    };

    get flySpeed() {
        return this.attributes[Attributes.FLY_SPEED];
    };

    get jumpVelocity() {
        return this.attributes[Attributes.JUMP_VELOCITY];
    };

    get health() {
        return this.attributes[Attributes.HEALTH];
    };

    get food() {
        return this.attributes[Attributes.FOOD];
    };

    get maxHealth() {
        return this.attributes[Attributes.MAX_HEALTH];
    };

    get maxFood() {
        return this.attributes[Attributes.MAX_FOOD];
    };

    get gravity() {
        return this.attributes[Attributes.GRAVITY];
    };

    get isFlying() {
        return this.attributes[Attributes.IS_FLYING];
    };

    get canToggleFly() {
        return this.attributes[Attributes.CAN_TOGGLE_FLY];
    };

    get canPhase() {
        return this.attributes[Attributes.CAN_PHASE];
    };

    get blockReach() {
        return this.attributes[Attributes.BLOCK_REACH];
    };

    get attackReach() {
        return this.attributes[Attributes.ATTACK_REACH];
    };

    get immobile() {
        return this.attributes[Attributes.IMMOBILE];
    };

    set walkSpeed(speed: number) {
        this.attributes[Attributes.WALK_SPEED] = speed;
    };

    set flySpeed(speed: number) {
        this.attributes[Attributes.FLY_SPEED] = speed;
    };

    set jumpVelocity(velocity: number) {
        this.attributes[Attributes.JUMP_VELOCITY] = velocity;
    };

    set health(health: number) {
        this.attributes[Attributes.HEALTH] = health;
    };

    set food(food: number) {
        this.attributes[Attributes.FOOD] = food;
    };

    set maxHealth(health: number) {
        this.attributes[Attributes.MAX_HEALTH] = health;
    };

    set maxFood(food: number) {
        this.attributes[Attributes.MAX_FOOD] = food;
    };

    set gravity(gravity: number) {
        this.attributes[Attributes.GRAVITY] = gravity;
    };

    set isFlying(isFlying: number) {
        this.attributes[Attributes.IS_FLYING] = isFlying;
    };

    set canToggleFly(canToggleFly: number) {
        this.attributes[Attributes.CAN_TOGGLE_FLY] = canToggleFly;
    };

    set canPhase(canPhase: number) {
        this.attributes[Attributes.CAN_PHASE] = canPhase;
    };

    set blockReach(blockReach: number) {
        this.attributes[Attributes.BLOCK_REACH] = blockReach;
    };

    set attackReach(attackReach: number) {
        this.attributes[Attributes.ATTACK_REACH] = attackReach;
    };

    set immobile(immobile: boolean) {
        this.attributes[Attributes.IMMOBILE] = immobile;
    };

    distance(x: number, y: number) {
        return Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
    };

    despawn() {
        delete this.world.entities[this.id];
        this.onMovement();
        const entities = this.world.getChunkEntitiesAt(this.x);
        const index = entities.indexOf(this);
        if (index !== -1) entities.splice(index, 1);
        this.broadcastDespawn();
    };
}