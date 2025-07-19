import EffectInstance from "@/effect/EffectInstance";
import Effect from "@/effect/Effect";

import BoundingBox from "@/entity/BoundingBox";
import Position, {getRotationTowards} from "@/utils/Position";
import {Packets} from "@/network/Packets";
import EntityTileBase from "@/entity/EntityTileBase";
import EntitySaveStruct from "@/structs/entity/EntitySaveStruct";
import World, {Collision} from "@/world/World";
import Item from "@/item/Item";
import {randInt} from "@/utils/Utils";
import {Damage} from "@/entity/Damage";
import EntityAnimationStruct from "@/structs/entity/EntityAnimationStruct";
import Packet from "@/network/Packet";
import Player from "@/entity/defaults/Player";
import {AnimationIds} from "@/meta/Animations";

export const DefaultWalkSpeed = 5;
export const DefaultFlySpeed = 7;
export const DefaultJumpVelocity = 7;
export const DefaultGravity = 18;
export const GroundHeight = 0.05;

export default abstract class Entity extends EntityTileBase {
    declare readonly world: World;

    _chunkX = NaN;
    _x = 0;
    _y = 0;
    renderX = 0;
    renderY = 0;
    vx = 0;
    vy = 0;
    suffocationVY = 0;
    onGround = true;
    groundCollision: Collision | null = null;
    bb: BoundingBox;
    groundBB = new BoundingBox(0, 0, 0, GroundHeight);
    cacheState: string;
    tags = new Set<string>;
    effects: Record<number, EffectInstance> = {};

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
    resistanceLevel = 0;
    fireImmunity = false;

    // first multiplied, then added
    attributeMultiplyModifiers: Record<string, number> = {};
    attributeAddModifiers: Record<string, number> = {};

    animation: (typeof EntityAnimationStruct.__TYPE__ & { time: number }) | null = null;

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
        if (this.world) delete this.world.entities[this.id];
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

    damage(damage: Damage) {
        const finalDamage = damage.getFinalDamage();
        if (finalDamage <= 0) return 0;

        this.setHealth(Math.max(0, this.health - finalDamage));
        if (this.health <= 0) {
            this.kill();
            return finalDamage;
        }

        this.broadcastPacketHere(new Packets.SEntityAnimation({
            entityId: this.id,
            animation: {
                id: AnimationIds.HURT,
                data: null
            }
        }));

        this.world.playSound(`assets/sounds/damage/hit${randInt(1, 3)}.ogg`, this.x, this.y);

        return finalDamage;
    };

    getArmorPoints() {
        return 0;
    };

    getArmorToughness() {
        return 0;
    };

    getGenericProtectionLevel() {
        return 0;
    };

    getFireProtectionLevel() {
        return 0;
    };

    getBlastProtectionLevel() {
        return 0;
    };

    getProjectileProtectionLevel() {
        return 0;
    };

    getFeatherFallingLevel() {
        return 0;
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
        this.onGround = !!(this.groundCollision = this.getGroundBlock());
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
        if (this.isClient || !(this instanceof Player)) { // Do not do these if it's a server-side player
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

            // Notify of movement changes
            if (this.x !== x || this.y !== y) this.onMovement();
        }

        this.calculateGround();
    };

    serverUpdate(dt: number): void {
        if (this.calcCacheState() !== this.cacheState) {
            this.updateCacheState();
            this.broadcastMovement();
        }

        this.update(dt);

        // Update effects
        let updatedAny = false;
        for (const [id, effect] of Object.entries(this.effects)) {
            effect.time -= dt;
            if (effect.time <= 0) {
                delete this.effects[id];
                effect.timeout(this);
                updatedAny = true;
            }
        }

        if (updatedAny) this.applyAttributes();
    };

    getBlockCollisionAt(x: number, y: number) {
        return this.world.getBlock(x, y).getCollision(this.bb, x, y);
    };

    protected onMovement() {
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

    getMovementData() {
        return {
            x: this.x,
            y: this.y
        };
    };

    getSpawnData() {
        return this.getMovementData();
    };

    broadcastMovement() {
        this.broadcastPacketHere(new Packets.SEntityUpdate({
            entityId: this.id,
            typeId: this.typeId,
            props: this.getMovementData()
        }), [this]);
    };

    broadcastSpawn() {
        this.broadcastPacketHere(new Packets.SEntityUpdate({
            entityId: this.id,
            typeId: this.typeId,
            props: this.getSpawnData()
        }), [this]);
    };

    broadcastDespawn() {
        this.broadcastPacketHere(new Packets.SEntityRemove(this.id), [this]);
    };

    getDrops() {
        return [];
    };

    getXPDrops() {
        return 0;
    };

    broadcastPacketHere(pk: Packet, exclude: Entity[] = [], immediate = false) {
        this.world.broadcastPacketAt(this.x, pk, exclude, immediate);
    };

    broadcastSoundHere(sound: string, volume = 1) {
        this.world.playSound(sound, this.x, this.y, volume);
    };

    kill(broadcast = true) {
        for (const drop of this.getDrops()) this.world.dropItem(this.x, this.y, drop);
        this.world.dropXP(this.x, this.y, this.getXPDrops());
        this.broadcastPacketHere(new Packets.SEntityAnimation({
            entityId: this.id,
            animation: {id: AnimationIds.DEATH, data: null}
        }));
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
        for (const effect of Object.values(this.effects)) effect.apply(this);
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
        this.resistanceLevel = 0;
        this.fireImmunity = false;
    };

    applyAttributes(reset = true) {
        if (reset) this.resetAttributes();
        this.applyEffects();
        this.applyAttributeModifiers();
    };

    applyAttributeModifiers() {
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
        const ex = this.effects[effect.typeId];
        if (ex) {
            if (ex.amplifier >= amplifier || (ex.amplifier === amplifier && ex.time > duration)) return;
            effect.timeout(this);
        }

        this.effects[effect.typeId] = new EffectInstance(effect, amplifier, duration);
    };

    removeEffect(effect: Effect) {
        const ex = this.effects[effect.typeId];
        if (ex) {
            effect.timeout(this);
            delete this.effects[effect.typeId];
        }
    };
}