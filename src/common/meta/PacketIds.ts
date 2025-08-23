export enum PacketIds {
    Batch,
    Ping,
    SendMessage,

    SPreLoginInformation,
    SHandshake,
    SSetChunks,
    SEntitiesUpdate,
    SEntityAnimation,
    SEntityRemove,
    SBlockUpdate,
    SBlockBreakingUpdate,
    SBlockBreakingStop,
    SDisconnect,
    SPlaySound,
    SPlaceBlock,
    SBreakBlock,
    SSetAttributes,
    SSetInventory,
    SUpdateInventory,
    SSetContainer,
    SSetHandIndex,
    SResetPlaceCooldown,
    // SEntityAnimation,
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
    COpenInventory,
    CCloseInventory,
    CPlaceBlock,
    CInteractBlock,
    CToggleFlight,
    CSetHandIndex,
    CItemTransfer,
    CItemDrop,
    CItemSwap,
    CSetItem,
    CRespawn
    // CContainerSwap,
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