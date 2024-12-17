import X from "stramp";
import ChunkBlocksBin from "@/structs/world/ChunkBlocksBin";
import EntitySaveStruct from "@/structs/entity/EntitySaveStruct";

export default X.object.struct({
    blocks: ChunkBlocksBin,
    entities: X.array.typed(EntitySaveStruct)
});