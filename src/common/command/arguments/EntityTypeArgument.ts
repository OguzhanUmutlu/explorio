import {CommandArgument} from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import {Position} from "@/utils/Position";
import {AnyToken} from "@/command/CommandProcessor";
import {EntityIds} from "@/meta/Entities";
import {Server} from "@/Server";

export class EntityTypeArgument extends CommandArgument<EntityIds> {
    default = null;

    getDefault() {
        if (!this.default) throw new Error(`No default value set for the '${this.name}' argument.`);

        return this.default;
    };

    read(_: CommandAs, __: Position, args: AnyToken[], index: number) {
        return Server.instance.entityNameToId[args[index].rawText];
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        return {
            error: arg && Server.instance.entityNameToId[arg.rawText] ? null : {
                token: arg,
                message: "Expected a valid entity name"
            }, index: index + 1
        };
    };

    toString() {
        return "entity_type";
    };
}