import {CommandArgument} from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import {Position} from "@/utils/Position";
import {AnyToken} from "@/command/CommandProcessor";
import {ItemIds} from "@/meta/ItemIds";
import {BlockData} from "@/item/BlockData";
import {im2data, name2data} from "@/item/ItemFactory";

export class ItemArgument extends CommandArgument<BlockData> {
    default = im2data(ItemIds.AIR);

    read(_: CommandAs, __: Position, args: AnyToken[], index: number) {
        return name2data(args[index].rawText);
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        return {
            error: arg && name2data(arg.rawText) ? null : {
                token: arg,
                message: "Expected a valid item name"
            }, index: index + 1
        };
    };

    toString() {
        return "item";
    };
}