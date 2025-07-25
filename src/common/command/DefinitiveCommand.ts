import Command from "@/command/Command";
import {CommandDefinitionType} from "@/command/CommandDefinition";
import {AnyToken, splitParameters} from "@/command/CommandProcessor";
import CommandArgument from "@/command/CommandArgument";
import CommandSender, {CommandAs} from "@/command/CommandSender";
import Position from "@/utils/Position";

export default abstract class DefinitiveCommand extends Command {
    abstract definitions: CommandDefinitionType[];

    protected constructor(
        public name: string,
        public description: string,
        public aliases: string[] = [],
        public permission: string | false = false
    ) {
        super(name, description, "", aliases, permission);
    };

    init() {
        super.init();
        this.definitions = this.definitions
            .sort((a, b) => b.arguments.length - a.arguments.length);
    };

    execute(sender: CommandSender, as: CommandAs, at: Position, _: string[], label: string) {
        const labelSpl = label.split(" ");
        const labelCmd = labelSpl[0];
        const params = labelSpl.slice(1).join(" ");
        const args = splitParameters(params);

        const maxPass = 0;
        let maxPassCmd: CommandDefinitionType | null = null;
        let maxPassArg: CommandArgument | null = null;
        let maxPassToken: AnyToken | null = null;
        let maxPassError: { token: AnyToken, message: string } | null = null;
        let resultArgs = [];

        let validCmd: CommandDefinitionType | null = null;
        for (const cmd of this.definitions) {
            const cmdArgs = cmd.arguments;
            resultArgs = [];

            let cmdInd = 0;
            let currentPasses = 0;
            let fail = false;

            for (let i = 0; i < args.length;) {
                if (cmdInd === cmdArgs.length) {
                    fail = true;
                    break;
                }
                const cmdArg = cmdArgs[cmdInd];
                const passes = cmdArg.blindCheck(args, i);
                if (passes.error) {
                    fail = true;
                    if (maxPassCmd === cmd || !maxPassCmd) {
                        maxPassArg = cmdArgs[cmdInd];
                        maxPassToken = args[i];
                        maxPassError = passes.error;
                    }
                    break;
                } else {
                    const v = cmdArg.read(as, at, args, i);
                    if (v !== undefined) resultArgs.push(v);
                    i = passes.index;
                    if (++currentPasses > maxPass) {
                        maxPassCmd = cmd;
                    }

                    if (i === args.length - 1 || !cmdArg.spread) cmdInd++;
                }
            }

            if (fail) continue;

            if (cmdInd !== cmdArgs.length) {
                if (cmdArgs[cmdInd].required) continue;
                for (; cmdInd < cmdArgs.length; cmdInd++) {
                    resultArgs.push(cmdArgs[cmdInd].getDefault());
                }
            }

            validCmd = cmd;

            break;
        }

        if (!validCmd) {
            if (maxPassArg && maxPassToken && maxPassError && args.length > 0) {
                const original = maxPassToken.originalText;
                const word = maxPassToken.raw;
                const before = original.slice(0, maxPassToken.start);
                const after = original.slice(maxPassToken.end);

                sender.sendMessage(`§c${maxPassError.message}: /${labelCmd} ${before} >>${word}<< ${after}`);
            } else {
                sender.sendMessage(`§c${this.definitions.length === 1 ? "Usage: " : "Usages:\n"}`
                    + this.definitions.map(i => `§c /${labelCmd} ${i.toString()}`).join("\n"));
            }
            return null;
        }

        if (validCmd.permission && !sender.hasPermission(validCmd.permission)) {
            sender.sendMessage("§cYou don't have permission to execute this command.");
            return null;
        }

        return validCmd.run(sender, as, at, ...resultArgs);
    };
}