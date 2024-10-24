import {Command} from "./Command";
import {CommandDefinition} from "./CommandDefinition";
import {Token} from "./CommandProcessor";
import {CommandArgument} from "./CommandArgument";

export abstract class AdvancedCommand extends Command {
    abstract definitions: CommandDefinition<any>[];

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
        this.usage = Object.keys(this.definitions).join(" | ");
        this.usageMessage = `§cUsage: ${this.getUsages().join("\n")}`;
    };

    define(source, args, params) {
        let maxPass = 0;
        let maxPassCmd: CommandDefinition | null = null;
        let maxPassArg: CommandArgument | null = null;
        let maxPassToken: Token | null = null;

        let validCmd: CommandDefinition | null = null;
        for (const cmd of this.definitions) {
            const cmdArgs = cmd.arguments;

            let cmdInd = 0;
            let currentPasses = 0;
            let fail = false;

            for (let i = 0; i < args.length;) {
                const passes = cmdArgs[cmdInd].blindCheck(args, i);
                if (passes.pass) {
                    i = passes.index;
                    if (++currentPasses > maxPass) {
                        maxPassCmd = cmd;
                    }

                    cmdInd++;
                    if (cmdInd === cmdArgs.length - 1) {
                        break; // ignore the rest of the arguments. (maybe fail=true to flag it as an error?)
                    }
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

            if (cmdInd !== cmdArgs.length - 1) continue;

            validCmd = cmd;

            break;
        }

        if (!validCmd) {
            if (maxPassArg && maxPassToken) {
                source.sendMessage(`§c${maxPassArg.name} argument failed at ${maxPassToken.start + 1}th character.`
                    + `Preview of 10 characters after the error: ${
                        maxPassToken.value.substring(maxPassToken.start, maxPassToken.start + 10)
                    }`);
            } else source.sendMessage(this.usageMessage);
            return null;
        }

        return validCmd;
    };

    getUsages() {
        return Object.keys(this.definitions).map(i => `/${this.name} ${i.toString()}`);
    };
}