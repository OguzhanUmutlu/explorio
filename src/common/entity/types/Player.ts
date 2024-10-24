import {Entity} from "../Entity";
import {BoundingBox} from "../BoundingBox";
import {Entities, EntityBoundingBoxes} from "../../meta/Entities";
import {Inventory} from "../../item/Inventory";
import {CommandSender} from "../../command/CommandSender";
import {World} from "../../world/World";
import {permissionCheck, PlayerStruct} from "../../utils/Utils";

export abstract class Player<WorldType extends World> extends Entity<WorldType> implements CommandSender {
    typeId = Entities.PLAYER;
    rotation = 0;
    bb: BoundingBox = EntityBoundingBoxes[Entities.PLAYER].copy();
    permissions: Set<string> = new Set;

    hotbar = new Inventory(9);
    inventory = new Inventory(27);
    armorInventory = new Inventory(4);
    cursor = new Inventory(1);
    chest = new Inventory(27);
    doubleChest = new Inventory(54);
    crafting2x2 = new Inventory(5);
    crafting3x3 = new Inventory(10);

    handIndex = 0;

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

    getSaveData(): (typeof PlayerStruct)["__TYPE__"] {
        return {
            x: this.x,
            y: this.y,
            worldFolder: this.world.folder,
            permissions: this.permissions,
            handIndex: this.handIndex,
            hotbar: this.hotbar.getSaveData(),
            inventory: this.inventory.getSaveData(),
            armorInventory: this.armorInventory.getSaveData(),
            cursor: this.cursor.getSaveData(),
            chest: this.chest.getSaveData(),
            doubleChest: this.doubleChest.getSaveData(),
            crafting2x2: this.crafting2x2.getSaveData(),
            crafting3x3: this.crafting3x3.getSaveData()
        };
    };

    getSaveBuffer(): Buffer {
        return PlayerStruct.serialize(this.getSaveData());
    };

    loadFromData(data: typeof PlayerStruct["__TYPE__"]) {
        this.x = data.x;
        this.y = data.y;
        this.world = this.server.worlds[data.worldFolder];
        this.hotbar = data.hotbar;
        this.inventory = data.inventory;
        this.armorInventory = data.armorInventory;
        this.cursor = data.cursor;
        this.chest = data.chest;
        this.doubleChest = data.doubleChest;
        this.crafting2x2 = data.crafting2x2;
        this.crafting3x3 = data.crafting3x3;
        this.handIndex = data.handIndex;
        this.permissions = data.permissions;
    };

    abstract save();

    abstract name: string;

    abstract sendMessage(message: string): void;

    abstract kick(): void;
}