import {AdvancedCommand} from "../AdvancedCommand";
import {CommandDefinition} from "../CommandDefinition";

export class SummonCommand extends AdvancedCommand {
    constructor() {
        super("summon", "Summons an entity.", [], "command.summon");
    };

    definitions = [
        new CommandDefinition()
            .addTextArgument("type")
            .addPositionArgument("position")
            .addObjectArgument("nbt")
            .then((source, as, at, type, pos, nbt) => {
            })

        // this works for example: /summon cow ~ ~ {hi: {hello: 10}}
        // and gives: ["cow", Vector2(0, 0), { hi: { hello: 10 } }]
    ];
}