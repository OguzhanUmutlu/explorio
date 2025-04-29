import World from "@/world/World";
import EntityTileBase from "@/entity/EntityTileBase";
import TileSaveStruct from "@/structs/tile/TileSaveStruct";

export default abstract class Tile extends EntityTileBase {
    readonly x: number;
    readonly y: number;
    readonly world: World;
    readonly rotation = 0;

    init() {
        const problem = !this.isClient && this.saveStruct.findProblem(this);

        if (problem) {
            console.warn("Invalid tile:", this, ", problem:", problem);
            return false;
        }

        this.world.tiles[this.id] = this;

        return true;
    };

    update(dt: number) {
    };

    getSaveBuffer(): Buffer {
        return TileSaveStruct.serialize(this);
    };

    despawn() {
        if (this.despawned) return;
        this.despawned = true;
        delete this.world.tiles[this.id];
        const tiles = this.getChunkTiles();
        if (tiles) tiles.delete(this);
    };
}