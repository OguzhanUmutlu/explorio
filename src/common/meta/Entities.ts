// How to add an entity?:
// 1. Add the entity's upper-cased name to the EntityIds in this file
// 2. Create a class for the entity in "src/common/entity/defaults/" by copying "ExampleEntity.ts"
// 3. That's it!
// Note: At least one file has to be importing the entity class in order for it to be auto-registered.

export enum EntityIds {
    PLAYER,
    ITEM,
    XP_ORB,
    FALLING_BLOCK
}
