import ChunkStruct from "./ChunkStruct";
import X from "stramp";
import {ChunkGroupLength} from "@/meta/WorldConstants";

export default X.array.typed(X.any.of(ChunkStruct, X.null)).sized(ChunkGroupLength);