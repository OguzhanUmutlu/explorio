import {CommandArgument} from "../CommandArgument";
import {CommandError} from "../Command";

export class TextArgument extends CommandArgument<string> {
    default = "";

    constructor(name: string, public choices: string[] = []) {
        super(name);
    };

    addChoices(choices: string[]) {
        this.choices = this.choices.concat(choices);
        return this;
    };

    read(as, at, args, index) {
        const arg = args[index];

        if (this.choices.length === 0) return arg.rawText;

        for (const choice of this.choices) {
            if (choice === arg.rawText) {
                return choice;
            }
        }

        throw new CommandError(`Expected one of these options: ${this.choices.join(", ")}`)
    };

    blindCheck(args, index) {
        return {pass: !!args[index], index: index + 1};
    };

    toString() {
        if (this.choices.length === 0) return "text";

        return `${this.choices.map(i => `'${i}'`).join(" | ")}`;
    };
}