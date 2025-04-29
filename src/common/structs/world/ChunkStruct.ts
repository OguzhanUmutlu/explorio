import X from "stramp";
import ChunkBlocksBin from "@/structs/world/ChunkBlocksBin";
import EntitySaveStruct from "@/structs/entity/EntitySaveStruct";
import TileSaveStruct from "@/structs/tile/TileSaveStruct";
import {ChunkBlockAmount} from "@/meta/WorldConstants";

export default X.object.struct({
    blocks: ChunkBlocksBin,
    entities: X.array.typed(EntitySaveStruct),
    tiles: X.array.typed(TileSaveStruct),
    updateSchedules: X.object.keyTyped(X.getNumberTypeOf(ChunkBlockAmount)).valueTyped(X.u8)
});