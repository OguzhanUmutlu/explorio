import {CommandArgument} from "../CommandArgument";

export class TextArgument extends CommandArgument<string> {
    constructor(name: string, public choices: string[] = []) {
        super(name);
    };

    addChoices(choices: string[]) {
        this.choices = this.choices.concat(choices);
        return this;
    };

    read(as, at, args, index) {
        const arg = args[index];

        if (this.choices.length === 0) return {value: arg.rawText, index: index + 1};

        for (const choice of this.choices) {
            if (choice === arg.rawText) {
                return {value: choice, index: index + 1};
            }
        }

        return null;
    };

    blindCheck(args, index) {
        return {pass: true, index: index + 1};
    };

    toString() {
        if (this.choices.length === 0) return "text";

        return `${this.choices.map(i => `'${i}'`).join(" | ")}`;
    };
}