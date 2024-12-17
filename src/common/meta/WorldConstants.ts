export const WorldHeightExp = 9;
export const WorldHeight = 1 << WorldHeightExp;
export const ChunkLengthBits = 4;
export const ChunkLength = 1 << ChunkLengthBits;
export const ChunkLengthN = ChunkLength - 1;
export const SubChunkAmount = WorldHeight / ChunkLength;
export const ChunkBlockAmount = ChunkLength * WorldHeight;