import {EntityIds} from "@/meta/Entities";
import Inventory from "@/item/Inventory";
import CommandSender from "@/command/CommandSender";
import {copyBuffer, permissionCheck, zstdOptionalDecode, zstdOptionalEncode} from "@/utils/Utils";
import PlayerNetwork from "@/network/PlayerNetwork";
import {Packets} from "@/network/Packets";
import {Containers, InventoryName, InventorySizes} from "@/meta/Inventories";
import Item from "@/item/Item";
import {EntitySaveStruct} from "@/structs/EntityTileSaveStruct";
import Packet from "@/network/Packet";
import {GameMode, GameModeStruct} from "@/command/arguments/GameModeArgument";
import Effect from "@/effect/Effect";
import PlayerKickEvent from "@/event/defaults/PlayerKickEvent";
import BoundingBox from "@/entity/BoundingBox";
import X, {def} from "stramp";
import Entity from "@/entity/Entity";
import {FallDamage} from "@/entity/damage/FallDamage";
import {Block} from "@/block/Block";
import Server from "@/Server";
import {InventoryStruct} from "@/structs/ItemStructs";
import World from "@/world/World";

const ContainerInventoryNames: Record<Containers, InventoryName[]> = {
    [Containers.Closed]: ["hotbar", "offhand"],

    [Containers.PlayerInventory]: ["hotbar", "offhand", "player", "armor", "craftingSmall", "craftingSmallResult", "cursor"],
    [Containers.Chest]: ["chest", "hotbar", "player", "cursor"],
    [Containers.DoubleChest]: ["doubleChest", "hotbar", "player", "cursor"],
    [Containers.CraftingTable]: ["craftingBig", "craftingBigResult", "hotbar", "player", "cursor"],
    [Containers.Furnace]: ["furnaceInput", "furnaceFuel", "furnaceResult", "hotbar", "player", "cursor"]
};

// The ones you can shift-click to (you can shift click them, you just can't shift click any other thing to move to these)
const nonShiftables: InventoryName[] = ["cursor", "player", "offhand", "hotbar", "armor", "craftingSmall",
    "craftingSmallResult", "craftingBig", "craftingBigResult"];

const temporaryInventories: InventoryName[] = ["cursor", "craftingSmall", "craftingBig"];

const InventoriesStruct = X.object.struct(["hotbar", "offhand", "player", "armor", "cursor"]
    .reduce((a, b) => ({...a, [b]: InventoryStruct(InventorySizes[b], b)}), {}));

X.object.struct({worldFolder: X.s16})
    .withConstructor(({worldFolder}) => Server.instance.worlds[worldFolder])

export default class Player extends Entity implements CommandSender {
    typeId = EntityIds.PLAYER;
    typeName = "player";

    @def(X.cstring) worldName = "";
    @def(X.s16.set()) permissions = new Set<string>;
    @def(X.u8) handIndex = 0;
    @def(GameModeStruct) gameMode = GameMode.Survival;
    @def(InventoriesStruct) inventories = <Record<InventoryName, Inventory>>{};

    name = "";
    skin = null;
    network: PlayerNetwork;

    bb = new BoundingBox(0, 0, 0.5, 1.8);
    breaking: [number, number] | null = null;
    breakingTime = 0;
    viewingChunks = new Set<number>;
    viewingEntities = new Set<number>();
    broadcastedItem: Item | null = null;

    xp = 0;
    xpLevels = 0;
    canBreak = true;
    canPlace = true;
    canAttack = true;
    blockReach = 5;
    attackReach = 5;
    isFlying = false;
    canToggleFly = false;
    instantBreak = false;
    infiniteResource = false;
    canPickupItems = true;
    seeShadows = false;
    placeCooldown = 0.3;
    food = 20;
    maxFood = 20;

    messageTimes: number[] = [];

    containerId = Containers.Closed;
    containerX = 0;
    containerY = 0;
    fallY = 0;

    init() {
        if (!this.isClient) {
            const server = Server.instance;
            this.setWorld(server.worlds[this.worldName] || server.defaultWorld);
        }

        for (const k in InventorySizes) {
            this.inventories[k] ??= new Inventory(InventorySizes[k], k);
        }

        return super.init();
    };

    protected setWorld(world: World): this {
        super.setWorld(world);
        this.worldName = this.world.name;
        return this;
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

    getShiftableInventoryNames() {
        return this.getAccessibleInventoryNames()
            .filter(i => !nonShiftables.includes(i));
    };

    getShiftableInventories() {
        return this.getShiftableInventoryNames().map(name => this.inventories[name]);
    };

    getSpawnData() {
        const item = this.handItem;
        return {
            ...super.getSpawnData(),
            handItemId: item?.id || 0,
            handItemMeta: item?.meta || 0
        };
    };

    getMovementData() {
        return {
            ...super.getMovementData(),
            rotation: this.rotation
        };
    };

    get handItem() {
        return this.hotbarInventory.get(this.handIndex);
    };

    set handItem(item: Item | null) {
        this.hotbarInventory.set(this.handIndex, item);
    };

    get offhandItem() {
        return this.offhandInventory.get(0);
    };

    set offhandItem(item: Item | null) {
        this.offhandInventory.set(0, item);
    };

    get cursorItem() {
        return this.cursorInventory.get(0);
    };

    set cursorItem(item: Item | null) {
        this.cursorInventory.set(0, item);
    };

    get hotbarInventory() {
        return this.inventories.hotbar;
    };

    get offhandInventory() {
        return this.inventories.offhand;
    };

    get playerInventory() {
        return this.inventories.player;
    };

    get armorInventory() {
        return this.inventories.armor;
    };

    get cursorInventory() {
        return this.inventories.cursor;
    };

    get chestInventory() {
        return this.inventories.chest;
    };

    get doubleChestInventory() {
        return this.inventories.doubleChest;
    };

    get craftingSmallInventory() {
        return this.inventories.craftingSmall;
    };

    get craftingSmallResultInventory() {
        return this.inventories.craftingSmallResult;
    };

    get craftingBigInventory() {
        return this.inventories.craftingBig;
    };

    get craftingBigResultInventory() {
        return this.inventories.craftingBigResult;
    };

    dropItem(inventory: Inventory, index: number, count = Infinity) {
        const item = inventory.get(index);
        if (!item || item.count === 0 || count === 0) return;
        if (count > item.count) count = item.count;
        this.world.dropItem(this.x, this.bb.height + this.bb.y, item.clone(count), this.rotation < 90 && this.rotation > -90 ? 4 : -4);
        inventory.decreaseItemAt(index, count);
    };

    /**
     * @description Empties temporary inventories
     */
    onCloseContainer() {
        for (const name of temporaryInventories) {
            const inv = this.inventories[name];
            for (let i = 0; i < inv.size; i++) {
                const item = inv.get(i);
                if (!item) continue;
                const left = this.addItem(item);
                item.count = left;
                inv.updateIndex(i);
                if (left > 0) this.dropItem(inv, i);
            }
        }
    };

    hasPermission(permission: string): boolean {
        return permissionCheck(this.permissions, permission);
    };

    calcCacheState() {
        return `${this.rotation.toFixed(1)};${super.calcCacheState()}`;
    };

    serverUpdate(dt: number) {
        const gravity = this.gravity;
        this.gravity = 0;
        const wasOnGround = this.onGround;
        super.serverUpdate(dt);
        this.gravity = gravity;

        this.breakingTime = Math.max(0, this.breakingTime - dt);
        if (this.instantBreak) this.breakingTime = 0;

        if (this.breaking && this.breakingTime === 0) {
            const bx = this.breaking[0];
            const by = this.breaking[1];
            this.breaking = null;

            if (!this.world.tryToBreakBlockAt(this, bx, by)) {
                this.network.sendBlock(bx, by);
                this.broadcastBlockBreaking();
                return;
            }
        }

        for (const name in this.inventories) {
            this.network.syncInventory(<InventoryName>name);
        }

        const isOnGround = this.onGround;
        const collision = this.groundCollision;

        if (!wasOnGround && isOnGround) {
            const fallDistance = this.fallY - this.y;
            this.damage(new FallDamage(this, new Block(this.world, collision.x, collision.y, collision.block), fallDistance));
            this.fallY = this.y;
        } else if (!isOnGround) {
            if (this.y > this.fallY) this.fallY = this.y;
        }

        this.network.releaseBatch();
    };

    kill(broadcast: boolean = true) {
        if (!this.world.gameRules.keepInventory) {
            for (const inv in this.inventories) for (const item of this.inventories[<InventoryName>inv].getContents()) {
                if (item && item.count > 0) {
                    this.world.dropItem(this.x, this.bb.height + this.bb.y, item.clone());
                }
            }
            this.clearInventories();
            this.network.sendInventories();
            if (this.xpLevels > 0) this.world.dropXP(this.x, this.y, Math.min(100, this.xpLevels * 7))
        }
        super.kill(broadcast);
        this.breaking = null;
        this.breakingTime = 0;
        this.broadcastBlockBreaking();
    };

    respawn() {
        this.despawned = false;
        this.breaking = null;
        this.breakingTime = 0;
        this.health = this.maxHealth;
        this.food = this.maxFood;
        const spawn = this.world.getSpawnPoint();
        this.teleport(spawn.x, spawn.y, this.world, false);
        this.broadcastBlockBreaking();
        this.network.sendAttributes();
        this.network.sendPosition();
        this.broadcastSpawn();
        this.onMovement();
    };

    despawn() {
        super.despawn();
        for (const x of this.viewingChunks) {
            this.world.chunks[x]?.dereference();
        }
        this.viewingChunks.clear();
        this.network.sendPacket(new Packets.SEntityRemove(this.id));
    };

    teleport(x: number, y: number, world = this.world, send = true) {
        super.teleport(x, y, world);
        this.fallY = this.y;
        if (send) this.network.sendPosition();

        return this;
    };

    broadcastBlockBreaking() {
        if (this.breaking) this.world.broadcastPacketAt(this.breaking[0], new Packets.SBlockBreakingUpdate({
            entityId: this.id,
            x: this.breaking[0],
            y: this.breaking[1],
            time: this.breakingTime
        }), [this]);
        else this.broadcastPacketHere(new Packets.SBlockBreakingStop({
            entityId: this.id
        }), [this]);
    };

    broadcastHandItem() {
        const item = this.handItem;

        if (this.broadcastedItem === null && item === null) return;
        if (this.broadcastedItem && this.broadcastedItem.equals(item, false, false)) return;

        this.broadcastedItem = item;
        this.broadcastPacketHere(new Packets.SEntitiesUpdate([{
            entityId: this.id,
            typeId: this.typeId,
            props: {handItemId: item ? item.id : 0, handItemMeta: item ? item.meta : 0}
        }]), [this]);
    };

    sendMessage(message: string): void {
        for (const msg of message.split("\n")) {
            this.network.sendMessage(msg);
        }
    };

    async chat(message: string) {
        await this.server.processMessage(this, message);
    };

    kick(reason = "Kicked by an operator") {
        const ev = new PlayerKickEvent(this, reason);
        if (ev.callGetCancel()) return;

        this.network.kick(ev.reason);
    };

    ban(reason = "Banned by an operator") {
        this.server.addBan(this.name, reason);
        this.kick(reason);
    };

    banIP(reason = "Banned by an operator") {
        for (const name in this.server.players) {
            const player = this.server.players[name];
            if (player.isOnline() && player !== this) player.kick(reason);
        }

        this.server.addIPBan(this.name, this.network.ip, reason);
        this.kick(reason);
    };

    isOnline() {
        return !this.network?.closed;
    };

    async save() {
        const playersFolder = this.server.path.to("players");
        await playersFolder.mkdir();

        const buffer = this.getSaveBuffer();
        const encoded = zstdOptionalEncode(buffer);
        await playersFolder.to(this.name + ".dat").write(encoded);
    };

    updateCollisionBox() {
        super.updateCollisionBox();
        this.bb.x = this.x - this.bb.width / 2;
        this.bb.y = this.y - 0.5;
    };

    addItem(item: Item) {
        const h = this.hotbarInventory.add(item);
        if (h === 0) return 0;
        return this.playerInventory.add(item, h);
    };

    removeItem(item: Item) {
        const h = this.hotbarInventory.remove(item);
        if (h === 0) return 0;
        return this.playerInventory.remove(item, h);
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

    static new(server: Server, name: string) {
        const player = new Player;
        player.name = name;
        const spawn = server.defaultWorld.getSpawnPoint();
        player.teleport(spawn.x, spawn.y, spawn.world, false);
        return player;
    };

    static async loadPlayer(server: Server, name: string) {
        const dataFile = server.path.to("players", name + ".dat");
        if (!await dataFile.exists()) {
            return Player.new(server, name);
        }

        let buffer = await dataFile.read();
        buffer = zstdOptionalDecode(copyBuffer(buffer));

        try {
            const player = <Player>EntitySaveStruct.parse(buffer);
            player.name = name;
            return player;
        } catch (e) {
            printer.error(e);
            printer.warn(`Player data corrupted, creating new player for ${name}`);
            return Player.new(server, name);
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

    applyAttributes(reset = true) {
        if (reset) this.resetAttributes();
        this.applyGameModeAttributes();
        super.applyAttributes(false);
        this.network?.sendAttributes();
    };

    applyGameModeAttributes() {
        switch (this.gameMode) {
            case GameMode.Survival:
                this.canBreak = true;
                this.canPlace = true;
                this.blockReach = 5;
                this.attackReach = 5;
                this.isFlying = false;
                this.canToggleFly = false;
                this.instantBreak = false;
                this.infiniteResource = false;
                this.canPickupItems = true;
                this.seeShadows = true;
                this.placeCooldown = 0.3;
                this.canPhase = false;
                this.invincible = false;
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
                this.canPickupItems = true;
                this.seeShadows = true;
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
                this.canPickupItems = true;
                this.seeShadows = true;
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
                this.canPickupItems = false;
                this.seeShadows = false;
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

    setGameMode(gameMode: GameMode) {
        this.gameMode = gameMode;
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
        super.setHealth(health);
        this.network?.sendAttributes();
    };

    setMaxHealth(maxHealth: number) {
        super.setMaxHealth(maxHealth);
        this.network?.sendAttributes();
    };

    setWalkSpeed(walkSpeed: number) {
        super.setWalkSpeed(walkSpeed);
        this.network?.sendAttributes();
    };

    setFlySpeed(flySpeed: number) {
        super.setFlySpeed(flySpeed);
        this.network?.sendAttributes();
    };

    setJumpVelocity(jumpVelocity: number) {
        super.setJumpVelocity(jumpVelocity);
        this.network?.sendAttributes();
    };

    setGravity(gravity: number) {
        super.setGravity(gravity);
        this.network?.sendAttributes();
    };

    setCanPhase(canPhase: boolean) {
        super.setCanPhase(canPhase);
        this.network?.sendAttributes();
    };

    setImmobile(immobile: boolean) {
        super.setImmobile(immobile);
        this.network?.sendAttributes();
    };

    setInvincible(invincible: boolean) {
        super.setInvincible(invincible);
        this.network?.sendAttributes();
    };

    setInvisible(invisible: boolean) {
        super.setInvisible(invisible);
        this.network?.sendAttributes();
    };

    setFlying(flying: boolean) {
        this.isFlying = flying;
        this.network?.sendAttributes();
    };

    setHandIndex(index: number) {
        this.handIndex = index;
        this.broadcastHandItem();
        this.network?.sendHandIndex();
    };

    getLevelMaxXP() {
        return this.xpLevels * 25;
    };

    reduceXP() {
        let max: number;

        while (this.xp >= (max = this.getLevelMaxXP())) {
            this.xp -= max;
            this.xpLevels++;
        }
    };

    setXP(xp: number) {
        this.xp = xp;
        this.reduceXP();
        this.network?.sendAttributes();
    };

    addXP(xp: number) {
        this.xp += xp;
        this.reduceXP();
        this.network?.sendAttributes();
    };

    setXPLevels(xpLevels: number) {
        this.xpLevels = xpLevels;
        this.reduceXP();
        this.network?.sendAttributes();
    };

    addXPLevels(xpLevels: number) {
        this.xpLevels += xpLevels;
        this.reduceXP();
        this.network?.sendAttributes();
    };
}