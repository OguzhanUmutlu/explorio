export enum PacketIds {
    Batch,
    Ping,
    SendMessage,

    SHandshake,
    SChunk,
    SEntityUpdate,
    SEntityRemove,
    SEntityAnimation,
    SBlockUpdate,
    SBlockBreakingUpdate,
    SBlockBreakingStop,
    SDisconnect,
    SContainerSet,
    SContainerSetIndex,
    SHandItem,
    SOpenContainer,
    SCloseContainer,
    SSetAttributes,
    SHandItemIndex,
    SPlaySound,
    SPlayAmbient,
    SStopAmbient,
    SContainerState,
    SUpdatePlayerList,
    SAddParticle,
    SApplyVelocity,
    SUpdateTime,

    CAuth,
    CQuit, // only for client-side, used for saving the world.
    CMovement,
    CStartBreaking,
    CStopBreaking,
    CPlaceBlock,
    CBreakBlock,
    CContainerSwap,
    CItemTransfer,
    CHandItem,
    CItemDrop,
    CCloseContainer,
    CInteractBlock,
    CToggleFlight,
    CObtainItem,
    CConsumeItem,
    CUpdateRotation,
    CHitEntity
}

export const PacketNames: { [key in keyof typeof PacketIds]: key } = {};

for (const key in PacketIds) {
    PacketNames[key] = key;
}