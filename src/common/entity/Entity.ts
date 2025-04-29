import EffectInstance from "@/effect/EffectInstance";
import Effect from "@/effect/Effect";

import BoundingBox from "@/entity/BoundingBox";
import Position, {getRotationTowards} from "@/utils/Position";
import {Packets} from "@/network/Packets";
import EntityTileBase from "@/entity/EntityTileBase";
import EntitySaveStruct from "@/structs/entity/EntitySaveStruct";
import World from "@/world/World";
import Item from "@/item/Item";

export const DefaultWalkSpeed = 5;
export const DefaultFlySpeed = 7;
export const DefaultJumpVelocity = 7;
export const DefaultGravity = 18;
export const GroundHeight = 0.05;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const tAny = null!;

export default abstract class Entity extends EntityTileBase {
    readonly world: World;

    _chunkX = NaN;
    _x = 0;
    _y = 0;
    renderX = 0;
    renderY = 0;
    vx = 0;
    vy = 0;
    suffocationVY = 0;
    onGround = true;
    bb: BoundingBox;
    groundBB = new BoundingBox(0, 0, 0, GroundHeight);
    cacheState: string;
    tags = new Set<string>;
    effects = new Set<EffectInstance>;

    walkSpeed = DefaultWalkSpeed;
    flySpeed = DefaultFlySpeed;
    jumpVelocity = DefaultJumpVelocity;
    health = 20;
    maxHealth = 20;
    gravity = DefaultGravity;
    canPhase = false;
    immobile = false;
    invincible = false;
    invisible = false;

    // first multiplied, then added
    attributeMultiplyModifiers: Record<string, number> = {};
    attributeAddModifiers: Record<string, number> = {};

    init(broadcast = true) {
        const problem = !this.isClient && this.saveStruct.findProblem(this);

        if (problem) {
            console.warn("Invalid entity:", this, ", problem:", problem);
            return false;
        }

        this.updateCacheState();
        this.world.entities[this.id] = this;
        if (this.world.isClient !== this.isClient) throw new Error("Unmatched isClient");
        this.applyAttributes();
        this.onMovement();
        if (broadcast && !this.isClient) this.broadcastSpawn();

        return true;
    };

    private get oldChunk() {
        return !isNaN(this._chunkX) ? this.world.getChunk(this._chunkX, false) : null;
    };

    private setWorld(world: World) {
        delete this.world.entities[this.id];
        const oldChunk = this.oldChunk;

        if (oldChunk) oldChunk.entities.delete(this);

        (<Position>this).world = world;

        const newChunk = world.getChunk(this.chunkX, false);
        newChunk.entities.add(this);
        newChunk.pollute();

        return this;
    };

    get handItem(): Item | null {
        return null;
    };

    getBlockReach() {
        return "blockReach" in this && typeof this.blockReach === "number" ? this.blockReach : Infinity;
    };

    getRotationTowards(x: number, y: number) {
        return getRotationTowards(this.bb.x + this.bb.width / 2, this.bb.y + this.bb.height, x, y);
    };

    get eyeHeight() {
        return this.bb.height;
    };

    tryToJump() {
        if (this.onGround) this.jump();
    };

    jump() {
        this.vy = this.jumpVelocity;
    };

    calcCacheState(): string {
        return `${this.x.toFixed(2)};${this.y.toFixed(2)}`;
    };

    updateCacheState() {
        this.cacheState = this.calcCacheState();
    };

    render(_ctx: CanvasRenderingContext2D, _dt: number) {
        this.renderX += (this.x - this.renderX) / 5;
        this.renderY += (this.y - this.renderY) / 5;
    };

    calculateGround() { // used in the server-side
        this.onGround = !!this.getGroundBlock();
    };

    getCollidingBlock() {
        return this.getCollidingBlocks(1)[0];
    };

    getCollidingBlocks(limit = 1) {
        return this.world.getBlockCollisions(this.bb, limit);
    };

    getGroundBlock() {
        return this.getGroundBlocks(1)[0];
    };

    getGroundBlocks(limit = 1) {
        return this.world.getBlockCollisions(this.groundBB, limit);
    };

    teleport(x: number, y: number, world = this.world) {
        this.x = x;
        this.y = y;

        if (this.world !== world) return this.setWorld(world);

        this.onMovement();

        return this;
    };

    tryToMove(x: number, y: number, dt: number) {
        if (this.immobile) return false;
        if (this.canPhase) {
            this.x += x;
            this.y += y;
            this.onMovement();
            return true;
        }

        const eps = 0.001;

        const already = this.getCollidingBlock();
        if (already) {
            this.suffocationVY += dt;
            this.y += dt * this.suffocationVY;
            this.onMovement();
            return false;
        }

        this.suffocationVY = 0;

        // Try combined movement first to check for corner cases
        if (Math.abs(x) > eps && Math.abs(y) > eps) {
            // Store original position
            const originalX = this.x;
            const originalY = this.y;

            // Try moving diagonally first
            this.x += x;
            this.y += y;
            this.updateCollisionBox();

            // If we hit something diagonally, handle x and y separately
            if (this.getCollidingBlock()) {
                // Reset position
                this.x = originalX;
                this.y = originalY;
                this.updateCollisionBox();
            } else {
                // Diagonal movement succeeded
                this.onMovement();
                return true;
            }
        }

        // Handle horizontal movement with binary search
        let dx = x;
        let mx = Math.abs(dx) <= eps;
        while (Math.abs(dx) > eps) {
            this.x += dx;
            this.updateCollisionBox();
            const coll = this.getCollidingBlock();
            if (coll) {
                if (
                    this.onGround
                    && coll.bb.y + coll.y + coll.bb.height - this.y < 0.51
                    && this.world.getBlock(coll.x, coll.y + 1).canBePhased
                ) {
                    // step!
                    this.y = coll.bb.y + coll.y + coll.bb.height;
                    break;
                } else {
                    this.x -= dx;
                    dx /= 2;
                }
            } else {
                mx = true;
                break;
            }
        }

        // Handle vertical movement with binary search
        let dy = y;
        let my = Math.abs(dy) <= eps;
        while (Math.abs(dy) > eps) {
            this.y += dy;
            this.updateCollisionBox();
            if (this.getCollidingBlock()) {
                this.y -= dy;
                dy /= 2;
            } else {
                my = true;
                break;
            }
        }

        this.onMovement();
        return mx && my;
    };

    update(dt: number) {
        const x = this.x, y = this.y;

        // Apply friction
        this.vx *= 0.999;
        this.vy *= 0.999;

        // Apply gravity
        this.vy -= this.gravity * dt;

        // Combined movement attempt to detect corner collisions
        const combinedResult = this.tryToMove(this.vx * dt, this.vy * dt, dt);

        // If combined movement failed, try individual axes
        if (!combinedResult) {
            const hitX = !this.tryToMove(this.vx * dt, 0, dt);
            const hitY = !this.tryToMove(0, this.vy * dt, dt);

            // Reset velocities on collision
            if (hitX) this.vx = 0;
            if (hitY) this.vy = 0;
        }

        this.calculateGround();

        // Notify of movement changes
        if (this.x !== x || this.y !== y) this.onMovement();

        // Update effects
        for (const effect of Array.from(this.effects)) {
            effect.time -= dt;
            if (effect.time <= 0) {
                this.effects.delete(effect);
                effect.remove(this);
            }
        }
    };

    serverUpdate(dt: number): void {
        if (this.calcCacheState() !== this.cacheState) {
            this.updateCacheState();
            this.broadcastMovement();
        }

        this.update(dt);
    };

    getBlockCollisionAt(x: number, y: number) {
        return this.world.getBlock(x, y).getCollision(this.bb, x, y);
    };

    private onMovement() {
        this._x = this.x;
        this._y = this.y;

        const world = this.world;

        const oldChunkX = this._chunkX;
        const newChunkX = this.chunkX;

        const oldChunk = this.oldChunk;
        const newChunk = world.getChunk(newChunkX, false);

        const oldEntities = oldChunk?.entities;
        const newEntities = newChunk.entities;

        if (oldChunkX !== newChunkX) {
            newEntities.add(this);
            newChunk.pollute();
            if (oldEntities) {
                oldEntities.delete(this);
                oldChunk.pollute();
            }
        }

        this._chunkX = newChunkX;

        this.updateCollisionBox();
        this.updateGroundBoundingBox();
    };

    updateGroundBoundingBox() {
        this.groundBB.x = this.bb.x;
        this.groundBB.y = this.bb.y - GroundHeight;
        this.groundBB.width = this.bb.width;
    };

    getMovementData(): Record<string, typeof tAny> {
        return {
            x: this.x,
            y: this.y
        };
    };

    getSpawnData(): Record<string, typeof tAny> {
        return this.getMovementData();
    };

    broadcastMovement() {
        this.world.broadcastPacketAt(this.x, new Packets.SEntityUpdate({
            entityId: this.id,
            typeId: this.typeId,
            props: this.getMovementData()
        }), [this]);
    };

    broadcastSpawn() {
        this.world.broadcastPacketAt(this.x, new Packets.SEntityUpdate({
            entityId: this.id,
            typeId: this.typeId,
            props: this.getSpawnData()
        }), [this]);
    };

    broadcastDespawn() {
        this.world.broadcastPacketAt(this.x, new Packets.SEntityRemove(this.id), [this]);
    };

    getDrops() {
        return [];
    };

    getXPDrops() {
        return 0;
    };

    kill(broadcast = true) {
        for (const drop of this.getDrops()) this.world.dropItem(this.x, this.y, drop);
        this.world.dropXP(this.x, this.y, this.getXPDrops());
        this.despawn(broadcast);
    };

    getSaveBuffer(): Buffer {
        return EntitySaveStruct.serialize(this);
    };

    despawn(broadcast = true) {
        if (this.despawned) return;
        this.despawned = true;
        delete this.world.entities[this.id];
        this.onMovement();
        const entities = this.getChunkEntities();
        if (entities) entities.delete(this);

        if (broadcast) this.broadcastDespawn();
    };

    updateCollisionBox() {
    };

    applyEffects() {
        for (const effect of this.effects) {
            effect.apply(this);
        }
    };

    protected resetAttributes() {
        this.walkSpeed = DefaultWalkSpeed;
        this.flySpeed = DefaultFlySpeed;
        this.jumpVelocity = DefaultJumpVelocity;
        this.health = 20;
        this.maxHealth = 20;
        this.gravity = DefaultGravity;
        this.canPhase = false;
        this.immobile = false;
        this.invincible = false;
        this.invisible = false;
    };

    applyAttributes(reset = true) {
        if (reset) this.resetAttributes();
        this.applyEffects();

        const mulKeys = Object.keys(this.attributeMultiplyModifiers);
        const addKeys = Object.keys(this.attributeAddModifiers);

        for (let i = 0; i < mulKeys.length; i++) {
            const key = mulKeys[i];
            this[key] *= this.attributeMultiplyModifiers[key];
        }

        for (let i = 0; i < addKeys.length; i++) {
            const key = addKeys[i];
            this[key] += this.attributeAddModifiers[key];
        }
    };

    setWalkSpeed(walkSpeed: number) {
        this.walkSpeed = walkSpeed;
    };

    setFlySpeed(flySpeed: number) {
        this.flySpeed = flySpeed;
    };

    setJumpVelocity(jumpVelocity: number) {
        this.jumpVelocity = jumpVelocity;
    };

    setHealth(health: number) {
        this.health = health;
    };

    setMaxHealth(maxHealth: number) {
        this.maxHealth = maxHealth;
    };

    setGravity(gravity: number) {
        this.gravity = gravity;
    };

    setCanPhase(canPhase: boolean) {
        this.canPhase = canPhase;
    };

    setImmobile(immobile: boolean) {
        this.immobile = immobile;
    };

    setInvincible(invincible: boolean) {
        this.invincible = invincible;
    };

    setInvisible(invisible: boolean) {
        this.invisible = invisible;
    };

    addEffect(effect: Effect, amplifier: number, duration: number) {
        this.effects.add(new EffectInstance(effect, amplifier, duration));
    };

    removeEffect(effect: Effect) {
        for (const e of Array.from(this.effects)) {
            if (e.effect.typeId === effect.typeId) {
                this.effects.delete(e);
                break;
            }
        }
    };
}