import X from "stramp";
import ChunkBlocksBin from "@/structs/ChunkBlocksBin";
import {EntitySaveStruct, TileSaveStruct} from "@/structs/EntityTileSaveStruct";
import {ChunkBlockAmount, ChunkGroupLength} from "@/meta/WorldConstants";

export const ChunkStruct = X.object.struct({
    blocks: ChunkBlocksBin,
    entities: EntitySaveStruct.array(),
    tiles: TileSaveStruct.array(),
    updateSchedules: X.u8.pairWithKey(X.getUnsignedTypeOf(ChunkBlockAmount))
});

export const ChunkGroupStruct = ChunkStruct.nullable().array(ChunkGroupLength);