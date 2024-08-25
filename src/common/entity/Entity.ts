import {Attributes} from "../Attributes";
import {BoundingBox} from "../BoundingBox";
import {World} from "../world/World";

export abstract class Entity<WorldType extends World = World> {
    chunk: WorldType["chunkEntities"][number];
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    onGround = true;
    world: WorldType;
    bb: BoundingBox;

    protected constructor(world: WorldType) {
        this.world = world;
    };

    attributes = {
        [Attributes.WALK_SPEED]: 5,
        [Attributes.FLY_SPEED]: 10,
        [Attributes.JUMP_VELOCITY]: 7,
        [Attributes.HEALTH]: 20,
        [Attributes.FOOD]: 20,
        [Attributes.MAX_HEALTH]: 20,
        [Attributes.MAX_FOOD]: 20,
        [Attributes.GRAVITY]: 18,
        [Attributes.IS_FLYING]: 0,
        [Attributes.CAN_TOGGLE_FLY]: 0,
        [Attributes.CAN_PHASE]: 0,
        [Attributes.BLOCK_REACH]: 5,
        [Attributes.ATTACK_REACH]: 5
    };

    collidesBlock() {
        return this.world.getBlockCollisions(this.bb, 1).length > 0;
    };

    tryToMove(x: number, y: number) {
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
        this.vx *= 0.999;
        this.vy *= 0.999;
        this.vy -= this.gravity * dt;
        const hitH = !this.tryToMove(this.vx * dt, 0);
        const hitV = !this.tryToMove(0, this.vy * dt);
        this.onGround = this.vy <= 0 && hitV;
        if (hitH) this.vx = 0;
        if (hitV) this.vy = 0;
        this.onMovement();
    };

    abstract serverUpdate(dt: number): void;

    onMovement() {
        const oldChunk = this.chunk;
        const newChunk = this.world.getChunkEntitiesAt(this.x);
        this.chunk = newChunk;
        if (oldChunk !== newChunk) {
            if (oldChunk) oldChunk.delete(this);
            if (newChunk) newChunk.add(this);
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

    distance(x: number, y: number) {
        return Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
    };
}