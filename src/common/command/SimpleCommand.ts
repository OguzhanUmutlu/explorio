import {CommandSender} from "./CommandSender";
import {Command} from "./Command";
import {CommandDefinition} from "./CommandDefinition";
import {RotatedPosition} from "../utils/RotatedPosition";

export abstract class SimpleCommand extends Command {
    abstract execute(source: CommandSender, as: CommandSender, at: RotatedPosition, args: string[], params: string): any;

    define(source, args, params) {
        return new CommandDefinition().then((source, as, at) => {
            return this.execute(source, as, at, args.map(t => t.rawText), params);
        });
    };
}