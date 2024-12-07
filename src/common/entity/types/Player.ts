import {Entities, EntityBoundingBoxes} from "@/meta/Entities";
import Inventory from "@/item/Inventory";
import CommandSender from "@/command/CommandSender";
import {getServer, permissionCheck, zstdOptionalDecode, zstdOptionalEncode} from "@/utils/Utils";
import PlayerNetwork from "@/network/PlayerNetwork";
import Entity from "@/entity/Entity";
import {Packets} from "@/network/Packets";
import {Containers, Inventories, InventoryName, InventorySizes} from "@/meta/Inventories";
import Item from "@/item/Item";
import EntitySaveStruct from "@/structs/entity/EntitySaveStruct";
import Packet from "@/network/Packet";
import {GameMode} from "@/command/arguments/GameModeArgument";
import Effect from "@/effect/Effect";
import {ChunkLengthBits} from "@/meta/WorldConstants";

const ContainerInventoryNames: Record<Containers, InventoryName[]> = {
    [Containers.Closed]: ["hotbar", "offhand"],

    [Containers.PlayerInventory]: ["hotbar", "offhand", "player", "armor", "craftingSmall", "craftingSmallResult", "cursor"],
    [Containers.Chest]: ["chest", "hotbar", "offhand", "player", "cursor"],
    [Containers.DoubleChest]: ["doubleChest", "hotbar", "offhand", "player", "cursor"],
    [Containers.CraftingTable]: ["craftingBig", "craftingBigResult", "hotbar", "offhand", "player", "cursor"],
};

export default class Player extends Entity implements CommandSender {
    typeId = Entities.PLAYER;
    typeName = "player";

    name = "";
    skin = null;
    network: PlayerNetwork;

    bb = EntityBoundingBoxes[Entities.PLAYER].copy();
    permissions = new Set<string>;
    breaking: [number, number] | null = null;
    breakingTime = 0;
    sentChunks = new Set<number>;
    viewingChunks: number[] = [];

    handIndex = 0;

    xp = 0;
    gamemode = GameMode.Survival;
    canBreak = true;
    canPlace = true;
    canAttack = true;
    blockReach = 5;
    attackReach = 5;
    isFlying = false;
    canToggleFly = false;
    instantBreak = false;
    infiniteResource = false;
    placeCooldown = 0.3;
    food = 20;
    maxFood = 20;

    messageTimes: number[] = [];

    containerId = Containers.Closed;
    inventories = <Record<InventoryName, Inventory>>{};

    init() {
        for (const k in Inventories) {
            const v = Inventories[<keyof typeof Inventories>k];
            this.inventories[v] ??= new Inventory(InventorySizes[v]);
        }

        super.init();
    };

    getAccessibleInventoryNames() {
        return ContainerInventoryNames[this.containerId];
    };

    canAccessInventory(name: InventoryName) {
        return this.getAccessibleInventoryNames().includes(name);
    };

    getAccessibleInventories() {
        return this.getAccessibleInventoryNames().map(name => this.inventories[name]);
    };

    getMovementData() {
        return {
            ...super.getMovementData(),
            rotation: this.rotation
        };
    };

    get handItem() {
        return this.inventories.hotbar.get(this.handIndex);
    };

    get cursorItem() {
        return this.inventories.cursor.get(0);
    };

    dropItem(inventory: Inventory, index: number, count = Infinity) {
        const item = inventory.get(index);
        if (!item || item.count === 0) return;
        if (count > item.count) count = item.count;
        this.world.dropItem(this.x, this.y, item);
        inventory.decreaseItemAt(index, count);
    };

    emptyCursor() {
        const cursorItem = this.cursorItem;
        if (cursorItem) {
            const leftCount = this.addItem(cursorItem);
            if (leftCount > 0) this.dropItem(this.inventories.cursor, 0, leftCount);
        }
    };

    hasPermission(permission: string): boolean {
        return permissionCheck(this.permissions, permission);
    };

    calcCacheState() {
        return `${this.rotation.toFixed(1)};${super.calcCacheState()}`;
    };

    serverUpdate(dt: number) {
        super.serverUpdate(dt);
        const chunkX = this.x >> ChunkLengthBits;
        const chunks = [];
        const chunkDist = this.server.config.renderDistance;
        for (let x = chunkX - chunkDist; x <= chunkX + chunkDist; x++) {
            chunks.push(x);
            this.world.ensureChunk(x);
            if (!this.sentChunks.has(x)) {
                this.sentChunks.add(x);
                this.world.sendChunk(this, x);
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
        if (this.instantBreak) this.breakingTime = 0;

        if (this.breaking && this.breakingTime === 0) {
            const bx = this.breaking[0];
            const by = this.breaking[1];
            this.breaking = null;


            if (!this.world.tryToBreakBlockAt(this, bx, by)) {
                this.network.sendBlock(bx, by);
                return;
            }
        }

        for (const name in this.inventories) {
            this.network.syncInventory(<InventoryName>name);
        }

        this.network.releaseBatch();
    };

    despawn() {
        super.despawn();
        for (const x of this.viewingChunks) {
            this.world.chunkReferees[x]--;
        }
    };

    teleport(x: number, y: number, send = true) {
        super.teleport(x, y);
        if (send) this.network.sendPosition();
    };

    broadcastBlockBreaking() {
        if (this.breaking) this.world.broadcastPacketAt(this.breaking[0], new Packets.SBlockBreakingUpdate({
            entityId: this.id,
            x: this.breaking[0],
            y: this.breaking[1],
            time: this.breakingTime
        }), [this]);
        else this.world.broadcastPacketAt(this.x, new Packets.SBlockBreakingStop({
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

    save() {
        this.server.createDirectory(`${this.server.path}/players`);

        const buffer = this.getSaveBuffer();
        const encoded = zstdOptionalEncode(buffer);
        this.server.writeFile(`${this.server.path}/players/${this.name}.dat`, encoded);
    };

    updateCollisionBox() {
        super.updateCollisionBox();
        this.bb.x = this.x - this.bb.width / 2;
        this.bb.y = this.y - 0.5;
    };

    addItem(item: Item) {
        const h = this.inventories.hotbar.add(item);
        if (h === 0) return 0;
        return this.inventories.player.add(item);
    };

    removeItem(item: Item) {
        const h = this.inventories.hotbar.remove(item);
        if (h === 0) return 0;
        return this.inventories.player.remove(item);
    };

    clearInventories() {
        for (const name in this.inventories) {
            const inv = this.inventories[<InventoryName>name];
            inv.clear();
        }
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

    static loadPlayer(name: string) {
        const server = getServer();
        const datPath = `${server.path}/players/${name}.dat`;
        if (!server.fileExists(datPath)) {
            return Player.new(name);
        }

        let buffer = server.readFile(datPath);
        buffer = zstdOptionalDecode(Buffer.from(buffer));

        try {
            const player = <Player>EntitySaveStruct.deserialize(buffer);
            player.name = name;
            return player;
        } catch (e) {
            printer.error(e);
            printer.warn(`Player data corrupted, creating new player for ${name}`);
            return Player.new(name);
        }
    };

    playSound(path: string, volume = 1) {
        this.playSoundAt(path, this.x, this.y, volume);
    };

    playSoundAt(path: string, x: number, y: number, volume = 1) {
        this.network?.sendSound(path, x, y, volume);
    };

    sendPacket(pk: Packet, immediate = false) {
        if (!this.network) return;
        this.network.sendPacket(pk, immediate);
    };

    applyAttributes() {
        this.applyGameModeAttributes();

        super.applyAttributes();

        this.network?.sendAttributes();
    };

    applyGameModeAttributes() {
        switch (this.gamemode) {
            case GameMode.Survival:
                this.canBreak = true;
                this.canPlace = true;
                this.blockReach = 5;
                this.attackReach = 5;
                this.isFlying = false;
                this.canToggleFly = false;
                this.instantBreak = false;
                this.infiniteResource = false;
                this.placeCooldown = 0.3;
                this.canPhase = false;
                this.invincible = false;
                this.invisible = false;
                break;
            case GameMode.Creative:
                this.canBreak = true;
                this.canPlace = true;
                this.canAttack = true;
                this.blockReach = 10;
                this.attackReach = 10;
                this.canToggleFly = true;
                this.instantBreak = true;
                this.infiniteResource = true;
                this.placeCooldown = 0;
                this.canPhase = false;
                this.invincible = true;
                break;
            case GameMode.Adventure:
                this.canBreak = false;
                this.canPlace = false;
                this.canAttack = true;
                this.blockReach = 0;
                this.attackReach = 5;
                this.isFlying = false;
                this.canToggleFly = false;
                this.instantBreak = false;
                this.infiniteResource = false;
                this.placeCooldown = 0;
                this.canPhase = false;
                this.invincible = false;
                break;
            case GameMode.Spectator:
                this.canBreak = false;
                this.canPlace = false;
                this.canAttack = false;
                this.blockReach = 0;
                this.attackReach = 0;
                this.isFlying = true;
                this.canToggleFly = false;
                this.instantBreak = false;
                this.infiniteResource = false;
                this.placeCooldown = 0;
                this.canPhase = true;
                this.invincible = true;
                break;
        }
    };

    addEffect(effect: Effect, amplifier: number, duration: number) {
        super.addEffect(effect, amplifier, duration);
        this.applyEffects();
    };

    setGameMode(gamemode: GameMode) {
        this.gamemode = gamemode;
        this.applyAttributes();
    };

    setFood(food: number) {
        this.food = food;
        this.network?.sendAttributes();
    };

    setMaxFood(maxFood: number) {
        this.maxFood = maxFood;
        this.network?.sendAttributes();
    };

    setHealth(health: number) {
        this.health = health;
        this.network?.sendAttributes();
    };

    setMaxHealth(maxHealth: number) {
        this.maxHealth = maxHealth;
        this.network?.sendAttributes();
    };

    setFlying(flying: boolean) {
        this.isFlying = flying;
        this.network?.sendAttributes();
    };
}