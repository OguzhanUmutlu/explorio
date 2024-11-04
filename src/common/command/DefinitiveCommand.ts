import {Command} from "./Command";
import {CommandDefinitionType} from "./CommandDefinition";
import {AnyToken, splitParameters} from "./CommandProcessor";
import {CommandArgument} from "./CommandArgument";

export abstract class DefinitiveCommand extends Command {
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

    execute(sender, as, at, _, label) {
        const labelSpl = label.split(" ");
        const labelCmd = labelSpl[0];
        const params = labelSpl.slice(1).join(" ");
        const args = splitParameters(params);

        let maxPass = 0;
        let maxPassCmd: CommandDefinitionType | null = null;
        let maxPassArg: CommandArgument | null = null;
        let maxPassToken: AnyToken | null = null;
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
                if (passes.pass) {
                    const v = cmdArg.read(as, at, args, i);
                    if (v !== undefined) resultArgs.push(v);
                    i = passes.index;
                    if (++currentPasses > maxPass) {
                        maxPassCmd = cmd;
                    }

                    if (i === args.length - 1 || !cmdArg.spread) cmdInd++;
                } else {
                    fail = true;
                    if (maxPassCmd === cmd) {
                        maxPassArg = cmdArgs[cmdInd];
                        maxPassToken = args[i];
                    }
                    break;
                }
            }

            if (fail) continue;

            if (cmdInd !== cmdArgs.length) {
                if (cmdArgs[cmdInd].required) continue;
                for (let i = cmdInd; cmdInd < cmdArgs.length; i++) {
                    resultArgs.push(cmdArgs[i].default);
                }
            }

            validCmd = cmd;

            break;
        }

        if (!validCmd) {
            if (maxPassArg && maxPassToken) {
                sender.sendMessage(`§c${maxPassArg.name} argument failed at ${maxPassToken.start + 1}th character. `
                    + `Preview of 10 characters after the error: ${
                        maxPassToken.value.substring(maxPassToken.start, maxPassToken.start + 10)
                    }`);
            } else {
                sender.sendMessage(
                    `§c${this.definitions.length === 1 ? "Usage: " : "Usages:\n"}`
                    + this.definitions.map(i => `§c /${labelCmd} ${i.toString()}`).join("\n")
                );
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