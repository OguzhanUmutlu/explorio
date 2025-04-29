import ChunkStruct from "./ChunkStruct";
import X from "stramp";
import {ChunkGroupLength} from "@/meta/WorldConstants";

export default X.array.typed(ChunkStruct.or(X.null)).sized(ChunkGroupLength);