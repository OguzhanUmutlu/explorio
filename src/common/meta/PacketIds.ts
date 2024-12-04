export enum PacketIds {
    Batch,
    Ping,
    SendMessage,

    SHandshake,
    SChunk,
    SEntityUpdate,
    SEntityRemove,
    SBlockUpdate,
    SBlockBreakingUpdate,
    SBlockBreakingStop,
    SDisconnect,
    SPlaySound,
    SPlaceBlock,
    SBreakBlock,
    SSetAttributes,
    SContainerSet,
    SContainerSetIndices,
    // SEntityAnimation,
    // SHandItem,
    // SOpenContainer,
    // SCloseContainer,
    // SHandItemIndex,
    // SPlayAmbient,
    // SStopAmbient,
    // SContainerState,
    // SUpdatePlayerList,
    // SAddParticle,
    // SApplyVelocity,
    // SUpdateTime,

    CAuth,
    CMovement,
    CStartBreaking,
    CStopBreaking,
    CCloseContainer,
    CPlaceBlock,
    CToggleFlight,
    // CContainerSwap,
    // CItemTransfer,
    // CHandItem,
    // CItemDrop,
    // CInteractBlock,
    // CToggleFlight,
    // CObtainItem,
    // CConsumeItem,
    // CUpdateRotation,
    // CHitEntity
}

export const PacketNames = <{ [key in keyof typeof PacketIds]: key }>{};

for (const key in PacketIds) {
    // @ts-expect-error It is readonly so it throws an error.
    PacketNames[key] = key;
}