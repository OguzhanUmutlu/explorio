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
    // SEntityAnimation,
    // SContainerSet,
    // SContainerSetIndex,
    // SHandItem,
    // SOpenContainer,
    // SCloseContainer,
    // SSetAttributes,
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
    // CPlaceBlock,
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

for (const key in <any>PacketIds) {
    PacketNames[key] = key;
}