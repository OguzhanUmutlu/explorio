import {Entities, EntityBoundingBoxes} from "../../meta/Entities";
import {Inventory} from "../../item/Inventory.js";
import {CommandSender} from "../../command/CommandSender";
import {
    CHUNK_LENGTH_BITS,
    EntitySaveStruct,
    getServer,
    permissionCheck,
    zstdOptionalDecode,
    zstdOptionalEncode
} from "../../utils/Utils";
import {B} from "../../meta/ItemIds";
import {PlayerNetwork} from "../../network/PlayerNetwork";
import {Entity} from "../Entity";
import {Packets} from "../../network/Packets";
import {Inventories} from "../../meta/Inventories.js";
import {Item} from "../../item/Item.js";

export class Player extends Entity implements CommandSender {
    typeId = Entities.PLAYER;
    typeName = "player";

    name = "";
    skin = null;
    network: PlayerNetwork;

    bb = EntityBoundingBoxes[Entities.PLAYER].copy();
    permissions: Set<string> = new Set;
    breaking: [number, number] | null = null;
    breakingTime = 0;
    sentChunks: Set<number> = new Set;
    viewingChunks: number[] = [];

    [Inventories.Hotbar] = new Inventory(9);
    [Inventories.Player] = new Inventory(27);
    [Inventories.Armor] = new Inventory(4);
    [Inventories.Cursor] = new Inventory(1);
    [Inventories.Chest] = new Inventory(27);
    [Inventories.DoubleChest] = new Inventory(54);
    [Inventories.CraftingSmall] = new Inventory(4);
    [Inventories.CraftingSmallResult] = new Inventory(1);
    [Inventories.CraftingBig] = new Inventory(9);
    [Inventories.CraftingBigResult] = new Inventory(1);

    handIndex = 0;

    xp = 0;
    blockReach = 5;
    attackReach = 5;
    isFlying = false;
    canToggleFly = false;
    food = 20;
    maxFood = 20;

    getMovementData(): any {
        return {
            ...super.getMovementData(),
            rotation: this.rotation
        };
    };

    get handItem() {
        return this.hotbar.get(this.handIndex);
    };

    hasPermission(permission: string): boolean {
        return permissionCheck(this.permissions, permission);
    };

    calcCacheState() {
        return `${this.rotation.toFixed(1)};${super.calcCacheState()}`;
    };

    async serverUpdate(dt: number) {
        super.serverUpdate(dt);
        const chunkX = Math.round(this.x) >> CHUNK_LENGTH_BITS;
        const chunks = [];
        const chunkDist = this.server.config.renderDistance;
        for (let x = chunkX - chunkDist; x <= chunkX + chunkDist; x++) {
            chunks.push(x);
            await this.world.ensureChunk(x);
            if (!this.sentChunks.has(x)) {
                this.sentChunks.add(x);
                await (<any>this.world).sendChunk(<any>this, x);
            }
            ++this.world.chunkReferees[x];
        }
        for (const x of this.sentChunks) {
            if (!chunks.includes(x)) {
                this.world.chunkReferees[x]--;
                this.sentChunks.delete(x);
            }
        }
        this.viewingChunks = chunks;

        this.breakingTime = Math.max(0, this.breakingTime - dt);

        if (this.breaking && this.breakingTime === 0) {
            const bx = this.breaking[0];
            const by = this.breaking[1];
            this.breaking = null;
            if (!this.world.tryToBreakBlockAt(this, bx, by)) {
                this.network.sendBlock(bx, by);
                return;
            }

            for (const p of this.world.getChunkViewers(bx >> CHUNK_LENGTH_BITS)) {
                p.network.sendBlock(bx, by, B.AIR);
            }
        }
    };

    despawn() {
        super.despawn();
        for (const x of this.viewingChunks) {
            this.world.chunkReferees[x]--;
        }
    };

    teleport(x: number, y: number) {
        super.teleport(x, y);
        this.network.sendPosition();
    };

    broadcastBlockBreaking() {
        if (this.breaking) this.world.broadcastPacketAt(this.breaking[0], this.breaking[1], new Packets.SBlockBreakingUpdate({
            entityId: this.id,
            x: this.breaking[0],
            y: this.breaking[1],
            time: this.breakingTime
        }), [this]);
        else this.world.broadcastPacketAt(this.x, this.y, new Packets.SBlockBreakingStop({
            entityId: this.id
        }), [this]);
    };

    sendMessage(message: string): void {
        for (const msg of message.split("\n")) {
            this.network.sendMessage(msg);
        }
    };

    kick(reason = "Kicked by an operator") {
        this.network.kick(reason);
    };

    async save() {
        if (!await this.server.fileExists(`${this.server.path}/players`)) {
            await this.server.createDirectory(`${this.server.path}/players`);
        }

        const buffer = this.getSaveBuffer();
        const encoded = zstdOptionalEncode(buffer);
        await this.server.writeFile(`${this.server.path}/players/${this.name}.dat`, encoded);
    };

    updateCollisionBox() {
        super.updateCollisionBox();
        this.bb.x = this.x - 0.25;
        this.bb.y = this.y - 0.5;
    };

    addItem(item: Item) {
        if (!this.hotbar.add(item)) return this.playerInventory.add(item);
        return true;
    };

    removeItem(item: Item) {
        if (!this.hotbar.remove(item)) return this.playerInventory.remove(item);
        return true;
    };

    //

    //

    //

    static new(name: string) {
        const player = new Player;
        player.name = name;
        const world = player.world = getServer().defaultWorld;
        player.x = 0;
        player.y = world.getHighHeight(player.x);
        return player;
    };

    static async loadPlayer(name: string) {
        const server = getServer();
        if (!await server.fileExists(`${server.path}/players/${name}.dat`)) {
            return Player.new(name);
        }

        let buffer = await server.readFile(`${server.path}/players/${name}.dat`);
        buffer = zstdOptionalDecode(Buffer.from(buffer));

        try {
            const player = <Player>EntitySaveStruct.deserialize(buffer);
            player.name = name;
            return player;
        } catch (e) {
            printer.warn(`Player data corrupted, creating new player for ${name}`);
            return Player.new(name);
        }
    };
}