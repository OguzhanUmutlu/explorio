import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";
import Vector2 from "@/utils/Vector2";
import {EntityNameMap} from "@/meta/Entities";

export default class SummonCommand extends DefinitiveCommand {
    constructor() {
        super("summon", "Summons the given entity.", [], "command.summon");
    };

    definitions = [
        new CommandDefinition()
            .addEntityTypeArgument("entity")
            .addPositionArgument("position", o => o.setOptional().setDefault(new Vector2(Infinity, 0)))
            .addObjectArgument("nbt", o => o.setOptional())
            .then((sender, _, loc, entityId, position, nbt) => {
                if (position.x === Infinity) position = loc.copy();

                const typeName = Object.keys(EntityNameMap).find(i => EntityNameMap[i] === entityId);

                if (sender.world.summonEntity(entityId, position.x, position.y, nbt)) {
                    sender.sendMessage(`§cSummoned ${typeName} at (${position.x}, ${position.y}).`);
                } else sender.sendMessage(`§cFailed to summon an ${typeName}.`);
            })
    ];
}