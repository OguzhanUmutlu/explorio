import CommandArgument from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";
import {AnyToken} from "@/command/CommandProcessor";
import {ItemMetadata} from "@/meta/Items";
import {IS, ItemsByIdentifier} from "@/meta/ItemIds";

export default class ItemArgument extends CommandArgument<ItemMetadata> {
    default = IS.AIR;

    read(_: CommandAs, __: Location, args: AnyToken[], index: number) {
        return ItemsByIdentifier[args[index].rawText];
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        if (!arg) return {pass: false, index: index + 1};

        return {pass: arg && ItemsByIdentifier[arg.rawText], index: index + 1};
    };

    toString() {
        return "item";
    };
}