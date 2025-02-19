import CommandArgument from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";
import {AnyToken} from "@/command/CommandProcessor";
import {ItemMetadata} from "@/meta/Items";
import {I, IM, ItemsByIdentifier} from "@/meta/ItemIds";

export default class ItemArgument extends CommandArgument<ItemMetadata> {
    default = IM[I.AIR];

    read(_: CommandAs, __: Location, args: AnyToken[], index: number) {
        return ItemsByIdentifier[args[index].rawText];
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        return {
            error: arg && ItemsByIdentifier[arg.rawText] ? null : {
                token: arg,
                message: "Expected a valid item name"
            }, index: index + 1
        };
    };

    toString() {
        return "item";
    };
}