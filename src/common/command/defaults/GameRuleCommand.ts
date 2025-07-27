import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";
import {ZWorldMetaData} from "@/world/World";
import CommandSender from "@/command/CommandSender";
import {ChunkBlockAmount} from "@/meta/WorldConstants";
import CommandError from "@/command/CommandError";

const gameRules = ZWorldMetaData.shape.gameRules.shape;
const gameRuleNames = Object.keys(gameRules);
const intGameRules = gameRuleNames.filter(rule => gameRules[rule]._def.innerType);
const boolGameRules = gameRuleNames.filter(rule => gameRules[rule]._def.typeName === "ZodBoolean");

function handleRuleSet(sender: CommandSender, rule: string, value: number | boolean) {
    if (!(rule in sender.world.gameRules)) {
        throw new CommandError("Unknown game rule: " + rule);
    }

    const oldValue = sender.world.gameRules[rule];

    if (rule === "randomTickSpeed" && (+value < 0 || +value > ChunkBlockAmount)) {
        throw new CommandError("Random tick speed must be between 0 and " + ChunkBlockAmount);
    }

    if (oldValue === value) {
        throw new CommandError("Game rule " + rule + " is already set to " + value);
    }

    sender.world.gameRules[rule] = value;
    sender.sendMessage("Game rule " + rule + " changed from " + oldValue + " to " + value);
}

export default class GameRuleCommand extends DefinitiveCommand {
    constructor() {
        super("gamerule", "Changes or views a game rule.", [], "command.gamerule");
    };

    definitions = [
        new CommandDefinition()
            .addTextArgument("rule", o => o.addChoices(intGameRules))
            .addNumberArgument("value")
            .then((sender, _, __, rule, value) => {
                handleRuleSet(sender, rule, value);
            }),
        new CommandDefinition()
            .addTextArgument("rule", o => o.addChoices(boolGameRules))
            .addBoolArgument("value")
            .then((sender, _, __, rule, value) => {
                handleRuleSet(sender, rule, value);
            }),
        new CommandDefinition()
            .addTextArgument("rule", o => o.addChoices(gameRuleNames))
            .then((sender, _, __, rule) => {
                if (!(rule in sender.world.gameRules)) throw new CommandError("Unknown game rule: " + rule);
                const value = sender.world.gameRules[rule];
                sender.sendMessage("Game rule " + rule + ": " + value);
            })
    ];
}