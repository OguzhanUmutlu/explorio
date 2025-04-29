import CommandArgument from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import Position from "@/utils/Position";
import {AnyToken} from "@/command/CommandProcessor";
import {ItemIds, Id2Data, ItemIdentifiers} from "@/meta/ItemIds";
import BlockData from "@/item/BlockData";

export default class ItemArgument extends CommandArgument<BlockData> {
    default = Id2Data[ItemIds.AIR];

    read(_: CommandAs, __: Position, args: AnyToken[], index: number) {
        return ItemIdentifiers[args[index].rawText];
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        return {
            error: arg && ItemIdentifiers[arg.rawText] ? null : {
                token: arg,
                message: "Expected a valid item name"
            }, index: index + 1
        };
    };

    toString() {
        return "item";
    };
}