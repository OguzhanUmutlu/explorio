import {BoundingBox} from "./BoundingBox";
import {World} from "../world/World";
import {EntityStructs, getServer, zstdOptionalDecode} from "../utils/Utils";
import {getRotationTowards, Location} from "../utils/Location";
import {Packets} from "../network/Packets";
import EntitySaveStruct from "../structs/EntitySaveStruct";

export const DEFAULT_WALK_SPEED = 5;
export const DEFAULT_FLY_SPEED = 10;
export const DEFAULT_JUMP_VELOCITY = 7;
export const DEFAULT_GRAVITY = 18;

let _entity_id = 0;

export abstract class Entity {
    abstract typeId: number;
    abstract typeName: string; // used in selectors' type= attribute
    abstract name: string; // used for chat messages and informational purposes
    id = _entity_id++;
    chunk: World["chunkEntities"][number];
    _x = 0;
    _y = 0;
    location = new Location(0, 0, 0, null);
    renderX = 0;
    renderY = 0;
    vx = 0;
    vy = 0;
    onGround = true;
    bb: BoundingBox;
    cacheState: any;
    tags = new Set<string>;

    walkSpeed = DEFAULT_WALK_SPEED;
    flySpeed = DEFAULT_FLY_SPEED;
    jumpVelocity = DEFAULT_JUMP_VELOCITY;
    health = 20;
    maxHealth = 20;
    gravity = DEFAULT_GRAVITY;
    canPhase = false;
    immobile = false;

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
        return EntityStructs[this.typeId];
    };

    getSaveBuffer(): Buffer {
        return EntitySaveStruct.serialize(this);
    };

    init() {
        this.updateCacheState();
        this.world.entities[this.id] = this;
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
        this.y -= 0.01;
        const collisions = this.world.getBlockCollisions(this.bb, 1);
        this.y += 0.01;
        this.onGround = collisions.length === 0;
    };

    getCollidingBlock() {
        return this.getCollidingBlocks(1)[0];
    };

    getCollidingBlocks(limit = 1) {
        return this.world.getBlockCollisions(this.bb, limit);
    };

    teleport(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.onMovement();
    };

    tryToMove(x: number, y: number, dt: number) {
        if (this.immobile) return false;
        let already = this.getCollidingBlock();
        if (already) {
            this.y += dt;
            this.onMovement();
            return false;
        }
        this.x += x;
        this.y += y;
        this.onMovement();
        if (this.getCollidingBlock()) {
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
        const hitGround = !this.tryToMove(0, this.vy * dt, dt);
        this.tryToMove(this.vx * dt, 0, dt);
        this.onGround = this.vy <= 0 && hitGround;
        if (hitGround) this.vy = 0;
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
        this.updateCollisionBox();
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
        this.world.broadcastPacketAt(this.x, new Packets.SEntityUpdate({
            entityId: this.id,
            typeId: this.typeId,
            props: this.getMovementData()
        }), [<any>this]);
    };

    broadcastSpawn() {
        this.world.broadcastPacketAt(this.x, new Packets.SEntityUpdate({
            entityId: this.id,
            typeId: this.typeId,
            props: this.getSpawnData()
        }), [<any>this]);
    };

    broadcastDespawn() {
        this.world.broadcastPacketAt(this.x, new Packets.SEntityRemove(this.id), [<any>this]);
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

    toString() {
        return this.name;
    };

    static spawn(world: World) {
        // @ts-ignore
        const entity = <this>new (<any>this);
        entity.world = world;
        entity.init();
        return entity;
    };

    static loadEntity(buffer: Buffer) {
        return EntitySaveStruct.deserialize(zstdOptionalDecode(buffer));
    };
}