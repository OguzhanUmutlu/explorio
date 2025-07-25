import CommandArgument from "@/command/CommandArgument";
import CommandError from "@/command/CommandError";
import {CommandAs} from "@/command/CommandSender";
import Position from "@/utils/Position";
import {AnyToken} from "@/command/CommandProcessor";

export default class TextArgument extends CommandArgument<string> {
    default = "";

    constructor(name: string, public choices: string[] = []) {
        super(name);
    };

    addChoices(choices: string[]) {
        this.choices = this.choices.concat(choices);
        return this;
    };

    read(_: CommandAs, __: Position, args: AnyToken[], index: number) {
        const arg = args[index];

        if (this.choices.length === 0) return arg.rawText;

        for (const choice of this.choices) {
            if (choice === arg.rawText) {
                return choice;
            }
        }

        throw new CommandError(`Expected one of these options: ${this.choices.join(", ")}`)
    };

    blindCheck(args: AnyToken[], index: number) {
        return {error: args[index] ? null : {token: null, message: "Expected any text"}, index: index + 1};
    };

    toString() {
        if (this.choices.length === 0) return "text";

        return `${this.choices.map(i => `'${i}'`).join(" | ")}`;
    };
}