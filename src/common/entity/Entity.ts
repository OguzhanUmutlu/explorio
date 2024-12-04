import BoundingBox from "@/entity/BoundingBox";
import World from "@/world/World";
import {EntityStructs, getServer, zstdOptionalDecode} from "@/utils/Utils";
import Location, {getRotationTowards} from "@/utils/Location";
import {Packets} from "@/network/Packets";
import EntitySaveStruct from "@/structs/entity/EntitySaveStruct";
import EffectInstance from "@/effect/EffectInstance";
import Effect from "@/effect/Effect";

export const DefaultWalkSpeed = 5;
export const DefaultFlySpeed = 10;
export const DefaultJumpVelocity = 7;
export const DefaultGravity = 18;
export const GroundHeight = 0.05;

let _entity_id = 0;

export default abstract class Entity {
    abstract typeId: number;
    abstract typeName: string; // used in selectors' type= attribute
    abstract name: string; // used for chat messages and informational purposes
    id = _entity_id++;
    chunkEntities: World["chunkEntities"][number];
    _x = 0;
    _y = 0;
    location = new Location(0, 0, 0, null);
    renderX = 0;
    renderY = 0;
    vx = 0;
    vy = 0;
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

    server = getServer();

    getBlockReach() {
        return "blockReach" in this && typeof this.blockReach === "number" ? this.blockReach : Infinity;
    };

    getRotationTowards(x: number, y: number) {
        return getRotationTowards(this.bb.x + this.bb.width / 2, this.bb.y + this.bb.height, x, y);
    };

    get eyeHeight() {
        return this.bb.height;
    };

    get struct() {
        return EntityStructs[<keyof typeof EntityStructs>this.typeId];
    };

    getSaveBuffer(): Buffer {
        return EntitySaveStruct.serialize(this);
    };

    init() {
        this.updateCacheState();
        this.world.entities[this.id] = this;
        this.applyAttributes();
        this.onMovement();
    };

    get x() {
        return this.location.x;
    };

    get y() {
        return this.location.y;
    };

    get rotation() {
        return this.location.rotation;
    };

    get world() {
        return this.location.world;
    };

    set x(x: number) {
        this.location.x = x;
    };

    set y(y: number) {
        this.location.y = y;
    };

    set rotation(rotation: number) {
        this.location.rotation = rotation;
    };

    set world(world) {
        this.location.world = world;
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

    teleport(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.onMovement();
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
            this.y += dt;
            this.onMovement();
            return false;
        }

        let dx = x;
        let mx = Math.abs(dx) <= eps;
        while (Math.abs(dx) > eps) {
            this.x += dx;
            this.updateCollisionBox();
            if (this.getCollidingBlock()) {
                this.x -= dx;
                dx /= 2;
            } else {
                mx = true;
                break;
            }
        }

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
        this.vx *= 0.999;
        this.vy *= 0.999;
        this.vy -= this.gravity * dt;
        const hitX = !this.tryToMove(this.vx * dt, 0, dt);
        const hitY = !this.tryToMove(0, this.vy * dt, dt);
        if (hitX) this.vx = 0;
        if (hitY) this.vy = 0;
        this.calculateGround();
        if (this.x !== x || this.y !== y) this.onMovement();
        for (const effect of Array.from(this.effects)) {
            effect.time -= dt;
            if (effect.time <= 0) {
                this.effects.delete(effect);
                effect.remove(this);
            }
        }
    };

    getChunkEntities() {
        return this.chunkEntities ?? [];
    };

    onMovement() {
        this._x = this.x;
        this._y = this.y;
        const oldChunk = this.chunkEntities;
        const newChunk = this.world.getChunkEntitiesAt(this.x);

        if (oldChunk !== newChunk) {
            newChunk.push(this);
            if (oldChunk) {
                const index = oldChunk.indexOf(this);
                if (index !== -1) oldChunk.splice(index, 1);
            }
        }

        this.chunkEntities = newChunk;
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

    serverUpdate(_dt: number): void {
        if (this.calcCacheState() !== this.cacheState) {
            this.updateCacheState();
            this.broadcastMovement();
        }
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

    updateCollisionBox() {
    };

    applyEffects() {
        for (const effect of this.effects) {
            effect.apply(this);
        }
    };

    applyAttributes() {
        this.applyEffects();
    };

    addEffect(effect: Effect, amplifier: number, duration: number) {
        this.effects.add(new EffectInstance(effect, amplifier, duration));
    };

    toString() {
        return this.name;
    };

    static spawn(world: World) {
        // @ts-expect-error Hello, there, you don't get to throw an error.
        const entity = <this>new (this);
        entity.world = world;
        entity.init();
        return entity;
    };

    static loadEntity(buffer: Buffer) {
        return EntitySaveStruct.deserialize(zstdOptionalDecode(buffer));
    };
}